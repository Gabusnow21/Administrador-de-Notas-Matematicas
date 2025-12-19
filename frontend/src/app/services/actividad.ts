import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalActividad, LocalDbService, SyncStatus } from './local-db';
import { tap, catchError, map } from 'rxjs/operators';

export interface Actividad {
  id?: number;
  localId?: number;
  nombre: string;
  descripcion?: string;
  fechaEntrega?: Date; // Mapeado de fecha_actividad
  materiaId: number;
  trimestreId: number;
  ponderacion: number;
  syncStatus?: string;
  materia?: any;
  trimestre?: any;
  // Nuevos campos para jerarquía
  subActividades?: Actividad[];
  parentId?: number;
  promedia?: boolean;
}

@Injectable({
  providedIn: 'root',
})

export class ActividadService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/actividades';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }

// ==========================================
  // 1. OBTENER FILTRADAS (Network First)
  // ==========================================
  getByMateriaAndTrimestre(materiaId: number, trimestreId: number): Observable<Actividad[]> {
    const mId = Number(materiaId);
    const tId = Number(trimestreId);

    if (this.isOnline) {
      return this.http.get<Actividad[]>(`${this.apiUrl}?materiaId=${mId}&trimestreId=${tId}`).pipe(
        map(data => this.flattenActivities(data)), // Aplanamos el árbol que viene del server
        tap(data => {
          // Guardamos en local asegurando el formato plano
          this.guardarEnLocalBatch(data);
        }),
        catchError(err => {
          console.warn('⚠️ Fallo API Actividades. Usando local.', err);
          return from(this.getLocalActividades(mId, tId));
        })
      );
    } else {
      console.log(`🔌 [ActividadService] Offline. Buscando Mat:${mId}, Tri:${tId}`);
      return from(this.getLocalActividades(mId, tId));
    }
  }

  // Helper para aplanar el árbol de actividades
  private flattenActivities(data: any[]): Actividad[] {
    const flattened: Actividad[] = [];
    
    const recurse = (items: any[]) => {
      for (const item of items) {
        // Hacemos una copia superficial
        const { subActividades, ...rest } = item;
        flattened.push(rest);
        if (subActividades && subActividades.length > 0) {
          recurse(subActividades);
        }
      }
    };
    
    recurse(data);
    return flattened;
  }

  // Helper para búsqueda local robusta
  private async getLocalActividades(mId: number, tId: number): Promise<Actividad[]> {
    // Usamos el filtro manual siempre, es más robusto ante inconsistencias de tipos (string/number)
    const todos = await this.localDb.actividades.toArray();
    const resultados = todos.filter((a: LocalActividad) =>
        Number(a.materiaId) === mId &&
        Number(a.trimestreId) === tId &&
        a.syncStatus !== 'delete'
    );

    console.log(`✅ Encontradas ${resultados.length} actividades locales (filtro manual).`);
    return resultados as Actividad[];
  }

  // Nuevo método para obtener TODAS las actividades locales (offline)
  getAllLocalActivities(): Observable<Actividad[]> {
    return from(this.localDb.actividades.where('syncStatus').notEqual('delete').toArray());
  }

  sincronizarTodo(): Observable<any> {
    if (!this.isOnline) return from([]);

    return this.http.get<Actividad[]>(`${this.apiUrl}/all`).pipe(
      map(data => this.flattenActivities(data)), // Aplanamos también aquí
      tap(data => {
        console.log(`📡 [Sync Actividades] Bajadas (planas): ${data.length}`);
        this.guardarEnLocalBatch(data);
      })
    );
  }

  // Helper para guardar array de actividades (aplanando objetos)
  private guardarEnLocalBatch(data: any[]) {
    const actividadesPlanas = data.map(a => ({
        ...a,
        // Extraer IDs si vienen anidados en objetos
        materiaId: Number(a.materia?.id || a.materiaId),
        trimestreId: Number(a.trimestre?.id || a.trimestreId),
        // Manejo de fecha
        fechaEntrega: a.fechaEntrega ? new Date(a.fechaEntrega) : undefined,
        // Nuevos campos
        parentId: a.parentId || (a.parent ? a.parent.id : null),
        promedia: !!a.promedia
    }));
    this.localDb.guardarActividadesServer(actividadesPlanas);
  }

  // ==========================================
  // 2. CREAR (Con Fallback y Fechas)
  // ==========================================
  crear(actividad: any): Observable<Actividad> {
    const guardarLocal = () => {
      console.log('🔌 Guardando actividad offline...');
      
      // Preparamos el objeto local (aplanando IDs y fecha)
      const actLocal: any = { 
        ...actividad, 
        materiaId: Number(actividad.materiaId), 
        trimestreId: Number(actividad.trimestreId),
        fechaEntrega: actividad.fechaEntrega, // Guardamos la fecha
        parentId: actividad.parentId,
        promedia: actividad.promedia,
        id: null,
        syncStatus: 'create' 
      };

      return from(this.localDb.actividades.add(actLocal).then(() => actLocal));
    };

    if (this.isOnline) {
      return this.http.post<Actividad>(this.apiUrl, actividad).pipe(
        tap(a => {
           // Éxito Online: Guardamos copia 'synced'
           const local: any = {
             ...a,
             materiaId: a.materia?.id || actividad.materiaId,
             trimestreId: a.trimestre?.id || actividad.trimestreId,
             // Aseguramos que la fecha se guarde
             fechaEntrega: a.fechaEntrega ? new Date(a.fechaEntrega) : actividad.fechaEntrega,
             parentId: a.parentId || actividad.parentId,
             promedia: a.promedia, 
             syncStatus: 'synced'
           };
           this.localDb.actividades.put(local);
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

  // ==========================================
  // 3. ACTUALIZAR (Con Fallback)
  // ==========================================
  actualizar(actividad: any): Observable<Actividad> {
    const actualizarLocal = async () => {
        console.log('🔌 Actualizando offline...', actividad);
        
        // Buscamos el registro robustamente
        const registro = await this.buscarRegistroLocal(actividad);

        if (registro) {
            const newSyncStatus: SyncStatus = registro.syncStatus === 'create' ? 'create' : 'update';
            await this.localDb.actividades.update(registro.localId!, {
                ...actividad,
                materiaId: Number(actividad.materiaId),
                trimestreId: Number(actividad.trimestreId),
                parentId: actividad.parentId,
                promedia: actividad.promedia,
                // Mantener estado 'create' si aún no sube, sino pasar a 'update'
                syncStatus: newSyncStatus
            });
            return actividad;
        }
        throw new Error(`Actividad no encontrada localmente (ID: ${actividad.id}, LocalID: ${actividad.localId})`);
    };

    if (this.isOnline) {
      return this.http.put<Actividad>(this.apiUrl, actividad).pipe(
        tap(() => {
           // Actualización optimista en local
           this.localDb.actividades.where('id').equals(actividad.id).modify({
             ...actividad,
             parentId: actividad.parentId,
             promedia: actividad.promedia,
             syncStatus: 'synced' as const
            });
        }),
        catchError(err => {
            console.warn('⚠️ Error PUT API:', err);
            return from(actualizarLocal());
        })
      );
    } else {
      return from(actualizarLocal());
    }
  }

  // ==========================================
  // 4. BORRAR (Con Retorno Void Corregido)
  // ==========================================
  borrar(actividad: Actividad): Observable<void> {
    const borrarLocal = async () => {
        const registro = await this.buscarRegistroLocal(actividad);
        if (registro) {
            if (registro.syncStatus === 'create') {
                await this.localDb.actividades.delete(registro.localId!);
            } else {
                await this.localDb.actividades.update(registro.localId!, { syncStatus: 'delete' as const });
            }
        }
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${actividad.id}`).pipe(
        tap(() => this.localDb.actividades.where('id').equals(actividad.id!).delete()),
        catchError(() => from(borrarLocal()))
      );
    } else {
      return from(borrarLocal());
    }
  }

    // --- HELPER: BÚSQUEDA ROBUSTA ---
  // Intenta encontrar el registro por ID servidor (numérico) o LocalID
  private async buscarRegistroLocal(act: any): Promise<any> {
    let registro;
    
    // 1. Intento por ID Servidor (Convertido a Number)
    if (act.id) {
        registro = await this.localDb.actividades.where('id').equals(Number(act.id)).first();
    }
    
    // 2. Si falla, intento por LocalID (si existe en el objeto)
    if (!registro && act.localId) {
        registro = await this.localDb.actividades.get(Number(act.localId));
    }

    return registro;
  }


}
