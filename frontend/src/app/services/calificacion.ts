import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { LocalDbService } from './local-db';

export interface PlanillaItem {
  estudianteId: number;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  calificacionId?: number;
  nota?: number;
  observacion?: string;
  modificado?: boolean;
}

export interface Calificacion {
  id?: number;
  localId?: number;
  nota: number;
  observacion?: string;
  estudianteId?: number;
  actividadId?: number;
  actividad?: any; // Usamos any para evitar errores de tipos anidados
  estudiante?: any;
  syncStatus?: string;
}

export interface CalificacionRequest {
  estudianteId: number;
  actividadId: number;
  nota: number;
  observacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalificacionService {
  private http = inject(HttpClient);
  private localDb = inject(LocalDbService);
  private apiUrl = 'http://localhost:8080/api/calificaciones';

  private get isOnline(): boolean { return navigator.onLine; }

  // ==========================================
  // 1. OBTENER PLANILLA (Fusión de Datos)
  // ==========================================
  obtenerPlanilla(gradoId: number, actividadId: number): Observable<PlanillaItem[]> {
    
    const leerDesdeLocal = () => from(this.construirPlanillaOffline(gradoId, actividadId));

    if (this.isOnline) {
      return this.http.get<PlanillaItem[]>(
        `${this.apiUrl}/planilla?gradoId=${gradoId}&actividadId=${actividadId}`
      ).pipe(
        switchMap(async (planillaServer) => {
          // Guardar en local lo que bajamos del servidor
          const notasParaGuardar = planillaServer
            .filter(item => item.calificacionId != null)
            .map(item => ({
               id: item.calificacionId,
               nota: item.nota,
               observacion: item.observacion,
               estudianteId: item.estudianteId,
               actividadId: actividadId
            }));

          if (notasParaGuardar.length > 0) {
            await this.localDb.guardarCalificacionesServerSafe(notasParaGuardar);
          }
          // Devolver siempre desde local (Single Source of Truth)
          return await this.construirPlanillaOffline(gradoId, actividadId);
        }),
        catchError(err => {
          console.warn('⚠️ Fallo API Planilla. Usando local.');
          return leerDesdeLocal();
        })
      );
    } else {
      return leerDesdeLocal();
    }
  }

  private async construirPlanillaOffline(gradoId: number, actividadId: number): Promise<PlanillaItem[]> {
    // 1. Obtener estudiantes
    const estudiantes = await this.localDb.getEstudiantesPorGrado(Number(gradoId));
    
    // 2. Obtener notas: Intentamos búsqueda numérica estricta
    // Si esto falla, es porque se guardaron como strings. 
    // Dexie no permite 'OR' en la query fácil, así que traemos todo si es necesario o confiamos en el Number()
    const notasRaw = await this.localDb.getCalificacionesPorActividad(Number(actividadId));

    // 3. Filtrado Inteligente (Gana el cambio pendiente)
    const mapaNotas = new Map<(number), any>();

    notasRaw.forEach(nota => {
      const idEst = Number(nota.estudianteId);
      
      if (mapaNotas.has(idEst)) {
        const existente = mapaNotas.get(idEst);
        
        const nuevaEsPendiente = nota.syncStatus === 'create' || nota.syncStatus === 'update';
        const existenteEsPendiente = existente.syncStatus === 'create' || existente.syncStatus === 'update';

        if (nuevaEsPendiente && !existenteEsPendiente) {
          mapaNotas.set(idEst, nota);
        } else if (nuevaEsPendiente === existenteEsPendiente) {
          if ((nota.localId || 0) > (existente.localId || 0)) {
            mapaNotas.set(idEst, nota);
          }
        }
      } else {
        mapaNotas.set(idEst, nota);
      }
    });
    
    // 4. Cruzar
    return estudiantes.map(est => {
      const idReal = est.id ? Number(est.id) : -1;
      const idLocal = est.localId ? Number(est.localId) : -1;
      
      const nota = mapaNotas.get(idReal) || mapaNotas.get(idLocal);

      return {
        estudianteId: est.id || est.localId!,
        nombreEstudiante: est.nombre,
        apellidoEstudiante: est.apellido,
        calificacionId: nota ? (nota.id || nota.localId) : undefined,
        nota: nota ? nota.nota : undefined,
        observacion: nota ? nota.observacion : undefined,
        modificado: false
      };
    });
  }

  // ==========================================
  // 2. GUARDAR NOTA (Upsert con Seguridad de Tipos)
  // ==========================================
  guardarCalificacion(request: CalificacionRequest, fromSync = false): Observable<any> {
    const requestSeguro = {
      ...request,
      estudianteId: Number(request.estudianteId),
      actividadId: Number(request.actividadId),
      nota: Number(request.nota)
    };

    if (fromSync) {
      // Si viene del SyncService, solo hacemos la petición HTTP y devolvemos.
      // El SyncService se encargará de actualizar el estado local.
      return this.http.post(this.apiUrl, requestSeguro);
    }

    const guardarLocal = () => {
      console.log('🔌 Guardando nota offline...');
      return from(this.localDb.guardarNotaOffline(requestSeguro));
    };

    if (this.isOnline) {
      return this.http.post(this.apiUrl, requestSeguro).pipe(
        tap((calificacionGuardada: any) => {
           // Después de guardar en el server, actualizamos el registro local
           // con el ID del servidor y lo marcamos como 'synced'.
           this.localDb.guardarNotaOffline({
             ...requestSeguro,
             id: calificacionGuardada.id, // <-- Usamos el ID devuelto por el servidor
             syncStatus: 'synced'
          });
        }),
        catchError(err => {
            console.warn('⚠️ Error POST Nota API:', err);
            // Si falla el guardado en el servidor, guardamos localmente
            // para sincronizar después.
            return guardarLocal();
        })
      );
    } else {
      // Si estamos offline, guardamos directamente en local.
      return guardarLocal();
    }
  }

  // ==========================================
  // 3. SINCRONIZAR TODO (Corrección de Compilación)
  // ==========================================
  sincronizarTodo(): Observable<any> {
    if (!this.isOnline) return from([]);

    return this.http.get<Calificacion[]>(`${this.apiUrl}/all`).pipe(
      tap(async (data) => {
        console.log(`📡 [Sync] Bajadas ${data.length} calificaciones.`);
        
        const notasPlanas = data.map(c => {
           // 👇 CORRECCIÓN: Casting a 'any' para evitar error TS2339
           const obj = c as any; 
           return {
             id: obj.id,
             nota: obj.nota,
             observacion: obj.observacion,
             estudianteId: obj.estudiante ? obj.estudiante.id : obj.estudianteId,
             actividadId: obj.actividad ? obj.actividad.id : obj.actividadId,
           };
        });

        await this.localDb.guardarCalificacionesServerSafe(notasPlanas);
      })
    );
  }

  // ==========================================
  // 4. BOLETÍN INDIVIDUAL
  // ==========================================
  getCalificacionesPorEstudiante(estudianteId: number): Observable<Calificacion[]> {
    if (this.isOnline) {
      return this.http.get<Calificacion[]>(`${this.apiUrl}/estudiante/${estudianteId}`).pipe(
        catchError(() => from(this.getLocalBoletin(estudianteId)))
      );
    } else {
      return from(this.getLocalBoletin(estudianteId));
    }
  }

  private async getLocalBoletin(estudianteId: number): Promise<Calificacion[]> {
     const notasLocales = await this.localDb.calificaciones
        .filter(n => n.estudianteId === Number(estudianteId))
        .toArray();
     
     const resultado: Calificacion[] = [];
     for (const n of notasLocales) {
       const actividad = await this.localDb.actividades.get(n.actividadId);
       if (actividad) {
         resultado.push({
           id: n.id,
           nota: n.nota,
           observacion: n.observacion,
           localId: n.localId,
           syncStatus: n.syncStatus,
           actividad: {
             id: actividad.id || actividad.localId!,
             nombre: actividad.nombre,
             ponderacion: actividad.ponderacion,
             trimestre: { nombre: 'Offline' }
           }
         });
       }else{
          console.warn(`⚠️ Actividad ID ${n.actividadId} no encontrada en local para estudiante ID ${estudianteId}.`);
       }
     }
     return resultado;
  }
}