import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { LocalDbService } from './local-db';

export interface Grado {
  id: number;
  nivel: string;    
  seccion: string;   
  anioEscolar: number;
  // Campos para manejo offline
  localId?: number;
  syncStatus?: string;
}

@Injectable({
  providedIn: 'root',
})

export class GradoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/grados';
  private localDb = inject(LocalDbService);

  // Helper para verificar conexión
  private get isOnline(): boolean {
    return navigator.onLine;
  }

  constructor() { }

  //Obtener todos los grados
  getGrados(): Observable<Grado[]> {
    if (this.isOnline) {
      return this.http.get<Grado[]>(this.apiUrl).pipe(
        tap(grados => {
          // ÉXITO ONLINE: Actualizamos la caché local
          console.log('📡 [GradoService] Datos bajados de API. Actualizando caché local...');
          this.localDb.guardarGradosServer(grados);
        }),
        catchError(err => {
          // FALLO API: Usamos local
          console.warn('⚠️ [GradoService] Fallo API. Usando datos locales.', err);
          return from(this.localDb.getGrados() as Promise<Grado[]>);
        })
      );
    } else {
      // OFFLINE: Directo a local
      console.log('🔌 [GradoService] Modo Offline. Leyendo DB local.');
      return from(this.localDb.getGrados() as Promise<Grado[]>);
    }
  }
  
  //Crear un nuevo grado
  crearGrado(grado: any): Observable<any> {
     if (this.isOnline) {
      return this.http.post<Grado>(this.apiUrl, grado).pipe(
        tap(g => {
          // Guardamos copia synced en local
          this.localDb.grados.put({ ...g, syncStatus: 'synced' });
        })
      );
    } else {
      console.log('🔌 [GradoService] Creando grado offline...');
      // Guardamos localmente con status 'create'
      return from(this.localDb.addGradoOffline(grado).then(localId => {
        // Devolvemos un objeto "fake" con el ID local para que la UI no se rompa
        return { ...grado, id: undefined, localId, syncStatus: 'create' } as Grado;
      }));
    }
  }

  //Actualizar un grado existente
  actualizarGrado(grado: Grado): Observable<Grado> {
    if (this.isOnline) {
      return this.http.put<Grado>(this.apiUrl, grado).pipe(
        tap(g => {
          if (g.id) {
            this.localDb.grados.where('id').equals(g.id).modify({ ...g, syncStatus: 'synced' });
          }
        })
      );
    } else {
      console.log('🔌 [GradoService] Actualizando grado offline...');
      return from(this.handleOfflineUpdate(grado));
    }
  }

  // Manejo de actualización offline
  private async handleOfflineUpdate(grado: Grado): Promise<Grado> {
    // Buscamos el registro local
    let registro;
    if (grado.id) {
        registro = await this.localDb.grados.where('id').equals(grado.id).first();
    } else if (grado.localId) {
        registro = await this.localDb.grados.get(grado.localId);
    }

    if (registro) {
        await this.localDb.grados.update(registro.localId!, {
            ...grado,
            // Si ya estaba pendiente de crear, sigue siendo 'create', si no, es 'update'
            syncStatus: registro.syncStatus === 'create' ? 'create' : 'update'
        });
        return { ...grado, ...registro };
    }
    throw new Error("Grado no encontrado localmente");
  }

  //Eliminar un grado por ID
  deleteGrado(id: number): Observable<void> {
    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => {
          this.localDb.grados.where('id').equals(id).delete();
        })
      );
    } else {
      console.log('🔌 [GradoService] Eliminando grado offline...');
      return from(this.handleOfflineDelete(id));
    }
  }
  // Manejo de eliminación offline
  private async handleOfflineDelete(id: number): Promise<void> {
    const registro = await this.localDb.grados.where('id').equals(id).first();
    if (registro) {
      if (registro.syncStatus === 'create') {
        // Si nunca se subió a la nube, lo borramos definitivamente
        await this.localDb.grados.delete(registro.localId!);
      } else {
        // Si existe en la nube, lo marcamos para borrar después
        await this.localDb.grados.update(registro.localId!, { syncStatus: 'delete' });
      }
    }
  }
  
  //Obtener un grado por ID
  getGradoPorId(id: number): Observable<Grado> {
    if (this.isOnline) {
      return this.http.get<Grado>(`${this.apiUrl}/${id}`).pipe(
        catchError(() => this.getLocalGrado(id))
      );
    } else {
      return this.getLocalGrado(id);
    }
  }
  // Obtener grado local por ID
  private getLocalGrado(id: number): Observable<Grado> {
    return from(this.localDb.grados.where('id').equals(id).first() as Promise<Grado>);
  }
  
}
