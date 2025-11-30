import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalDbService } from './local-db';
import { tap, catchError } from 'rxjs/operators';

export interface Actividad {
  id: number;
  nombre: string;
  descripcion: string;
  fechaEntrega: Date;
  materiaId: number;
  trimestreId: number;
  ponderacion: number;
  syncStatus?: string;
  materia?: any; 
  trimestre?: any;
}

@Injectable({
  providedIn: 'root',
})

export class ActividadService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/actividades';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }

  // Obtener todas las actividades
  getAll(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(this.apiUrl);
  }

  // Obtener actividades por materia y trimestre
  getByMateriaAndTrimestre(materiaId: number, trimestreId: number): Observable<Actividad[]> {
   if (this.isOnline) {
      return this.http.get<Actividad[]>(`${this.apiUrl}?materiaId=${materiaId}&trimestreId=${trimestreId}`).pipe(
        tap(data => {
          // Guardamos en local para caché
          this.localDb.guardarActividadesServer(data);
        }),
        catchError(err => {
          console.warn('⚠️ Fallo API Actividades. Usando local.');
          return from(this.localDb.getActividades(materiaId, trimestreId) as Promise<Actividad[]>);
        })
      );
    } else {
      console.log('🔌 Offline. Usando actividades locales.');
      return from(this.localDb.getActividades(materiaId, trimestreId) as Promise<Actividad[]>);
    }
  }
  // Crear una nueva actividad
  crear(actividad: any): Observable<Actividad> {
    const guardarLocal = () => {
      console.log('🔌 Guardando actividad offline...');
      // Nos aseguramos de tener los IDs planos
      const actLocal: any = { 
        ...actividad, 
        materiaId: actividad.materiaId, 
        trimestreId: actividad.trimestreId,
        id: null,
        syncStatus: 'create',
      };
      return from(this.localDb.actividades.add(actLocal).then(() => actLocal));
    };

    if (this.isOnline) {
      return this.http.post<Actividad>(this.apiUrl, actividad).pipe(
        tap(a => {
           // Guardar copia synced. Ojo: el backend devuelve la actividad con objetos anidados.
           // Debemos aplanarla para localDb.
           const local = {
             ...a,
             materiaId: a.materia?.id || actividad.materiaId,
             trimestreId: a.trimestre?.id || actividad.trimestreId,
             syncStatus: 'synced'
           };
           this.localDb.actividades.put(local as any);
        }),
        catchError(err => {
            console.warn('⚠️ Error POST API:', err);
            return guardarLocal();
        })
      );
    } else {
      return guardarLocal();
    }
  }
  // Actualizar una actividad existente
  actualizar(actividad: Actividad): Observable<Actividad> {
    // Nota: actividad.id es el del servidor
    const actualizarLocal = () => from(
        this.localDb.actividades.where('id').equals(actividad.id).modify({
            ...actividad,
            syncStatus: 'update'
        }).then(() => actividad)
    );

    if (this.isOnline) {
      return this.http.put<Actividad>(this.apiUrl, actividad).pipe(
        tap(() => {
           // Actualizar local como synced
           this.localDb.actividades.where('id').equals(actividad.id).modify({ 
             ...actividad, 
             syncStatus: 'synced' 
            });
        }),
        catchError(err => {
            console.warn('⚠️ Error PUT API:', err);
            return actualizarLocal();
        })
      );
    } else {
      return actualizarLocal();
    }
  }
  // Borrar una actividad por ID
  borrar(id: number): Observable<void> {
    const borrarLocal = () => from(
        this.localDb.actividades.where('id').equals(id)
        .modify({ syncStatus: 'delete' } as any).then(() => {})
    );

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.localDb.actividades.where('id').equals(id).delete()),
        catchError(err => {
            console.warn('⚠️ Error DELETE API:', err);
            return borrarLocal();
        })
      );
    } else {
      return borrarLocal();
    }
  }
}
