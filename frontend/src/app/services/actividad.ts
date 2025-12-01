import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalDbService } from './local-db';
import { tap, catchError } from 'rxjs/operators';

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
    if (this.isOnline) {
      return this.http.get<Actividad[]>(`${this.apiUrl}?materiaId=${materiaId}&trimestreId=${trimestreId}`).pipe(
        tap(data => {
          console.log('📡 [ActividadService] Bajando datos frescos...');
          // Mapeamos la fecha string del backend a objeto Date si es necesario
          const actividades = data.map(a => ({
            ...a,
            fechaEntrega: a.fechaEntrega ? new Date(a.fechaEntrega) : undefined
          }));
          this.localDb.guardarActividadesServer(actividades);
        }),
        catchError(err => {
          console.warn('⚠️ [ActividadService] Fallo API. Usando local.');
          return from(this.getLocalActividades(materiaId, trimestreId));
        })
      );
    } else {
      console.log('🔌 [ActividadService] Offline. Usando local.');
      return from(this.getLocalActividades(materiaId, trimestreId));
    }
  }

  // Helper para obtener y convertir fechas de local
  private async getLocalActividades(materiaId: number, trimestreId: number): Promise<Actividad[]> {
    const data = await this.localDb.getActividades(materiaId, trimestreId);
    // Dexie guarda las fechas bien, pero nos aseguramos de devolver el tipo correcto
    return data as unknown as Actividad[];
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
            await this.localDb.actividades.update(registro.localId!, {
                ...actividad,
                materiaId: Number(actividad.materiaId),
                trimestreId: Number(actividad.trimestreId),
                // Mantener estado 'create' si aún no sube, sino pasar a 'update'
                syncStatus: registro.syncStatus === 'create' ? 'create' : 'update'
            } as any);
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
             syncStatus: 'synced' 
            } as any);
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
    
    // CASO 1: Local puro (nunca subió a la nube) -> Borrado Físico
    if (!actividad.id) {
      console.log('🗑️ Borrando actividad local pura...');
      return from(this.localDb.actividades.delete(actividad.localId!).then(() => {}));
    }

    // CASO 2: Existe en nube -> Borrado Lógico (marcar para borrar luego)
    const borrarLocalmente = () => {
        console.log('🔌 Marcando para borrar offline...');
        return from(
            this.localDb.actividades.where('id').equals(actividad.id!)
            .modify({ syncStatus: 'delete' } as any)
            .then(() => {}) // Forzamos retorno void para calmar a TypeScript
        );
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${actividad.id}`).pipe(
        tap(() => this.localDb.actividades.where('id').equals(actividad.id!).delete()),
        catchError(err => {
            console.warn('⚠️ Error DELETE API:', err);
            return borrarLocalmente();
        })
      );
    } else {
      return borrarLocalmente();
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
