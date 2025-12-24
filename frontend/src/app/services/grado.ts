import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService, LocalGrado } from './local-db';

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
  private apiUrl = 'environment.apiUrl' + '/api/grados';
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
    return from(
      this.localDb.grados.where('id').equals(id).first().then((result: LocalGrado | undefined) => {
        if (result) return result as Grado;
        throw new Error('Grado no encontrado en local');
      })
    );
  }

    //Crear un nuevo grado
      crearGrado(grado: Grado): Observable<Grado> {
    const guardarLocalmente = () => {
      console.log('🔌 [GradoService] Guardando offline...');

      const gLocal = {
        ...grado,
        id: undefined,
        syncStatus: 'create' as const
      };

      return from(this.localDb.addGradoOffline(gLocal).then(localId => {
        return { ...grado, localId, syncStatus: 'create' } as Grado;
      }));
    };

    if (this.isOnline) {
      return this.http.post<Grado>(this.apiUrl, grado).pipe(
        tap(g => {
          // Guardar copia synced
          this.localDb.grados.put({ ...g, syncStatus: 'synced' as const });
        }),
        catchError(err => {
          console.warn('⚠️ Error POST API:', err);
          return guardarLocalmente();
        })
      );
    } else {
      return guardarLocalmente();
    }
  }

  //Actualizar un grado existente
  actualizarGrado(grado: Grado): Observable<Grado> {
    const actualizarLocalmente = () => {
        console.log('🔌 Actualizando offline...');
        // Intentamos actualizar buscando por ID de servidor
        return from(this.localDb.grados.where('id').equals(grado.id!).modify({
            ...grado,
            syncStatus: 'update' as const
        }).then(() => grado));
    };

    if (this.isOnline) {
      return this.http.put<Grado>(this.apiUrl, grado).pipe(
        tap(g => {
           if (g.id) {
             this.localDb.grados.where('id').equals(g.id).modify({ ...g, syncStatus: 'synced' as const });
           }
        }),
        catchError(err => {
            console.warn('⚠️ Error PUT API:', err);
            return actualizarLocalmente();
        })
      );
    } else {
      return actualizarLocalmente();
    }
  }

  // Manejo de actualización offline
  /*private async handleOfflineUpdate(grado: Grado): Promise<Grado> {
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
  }*/

  //Eliminar un grado por ID
  deleteGrado(grado: Grado): Observable<void> {

    // CASO 1: Es un grado local nuevo que nunca se subió (No tiene ID de servidor)
    // Simplemente lo borramos de la DB local y listo.
    if (!grado.id) {
      console.log('🗑️ [GradoService] Borrando grado local (nunca sincronizado)...');
      return from(this.localDb.grados.delete(grado.localId!).then(() => {}));
    }

    // CASO 2: Es un grado que ya existe en el servidor (Tiene ID)
    const borrarLocalmente = () => {
        console.log('🔌 [GradoService] Marcando para borrar offline...');
        return from(
            this.localDb.grados.where('id').equals(grado.id!)
            .modify({ syncStatus: 'delete' as const })
            .then(() => {})
        );
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${grado.id}`).pipe(
        // Si hay internet, lo borramos de la API y luego de la BD local
        tap(() => this.localDb.grados.where('id').equals(grado.id!).delete()),
        catchError(err => {
            console.warn('⚠️ Error DELETE API:', err);
            return borrarLocalmente();
        })
      );
    } else {
      return borrarLocalmente();
    }
  }
  
}
