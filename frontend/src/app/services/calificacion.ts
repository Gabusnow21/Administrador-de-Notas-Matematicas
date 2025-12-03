import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalDbService } from './local-db';
import { tap, catchError } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';

export interface PlanillaItem {
  estudianteId: number;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  calificacionId?: number;
  nota?: number;
  observacion?: string;
  // Campo auxiliar para el frontend (saber si se modificó)
  modificado?: boolean;
}

export interface Calificacion {
  id?: number;
  nota: number;
  observacion?: string;
  actividad: {
    id: number;
    nombre: string;
    ponderacion: number;
    trimestre: {
      nombre: string;
    }
  };
    // Campos opcionales para manejo local
  localId?: number;
  syncStatus?: string;
}

//Interfaz para enviar datos al backend
export interface CalificacionRequest {
  estudianteId: number;
  actividadId: number;
  nota: number;
  observacion: string;
}

@Injectable({
  providedIn: 'root',
})
export class CalificacionService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/calificaciones';
  private localDb = inject(LocalDbService);

  // Helper para saber el estado de la red
  private get isOnline(): boolean {
    return navigator.onLine;
  }
  // ==========================================
  // 1. OBTENER PLANILLA (Individual o Masiva)
  // ==========================================

  // Este método es el "Join" complejo.
  obtenerPlanilla(gradoId: number, actividadId: number): Observable<PlanillaItem[]> {
    
    const leerDesdeLocal = () => from(this.construirPlanillaOffline(gradoId, actividadId));

    if (this.isOnline) {
      // 1. Antes de llamar a la API, verificamos si hay cosas pendientes en local
      return from(this.localDb.calificaciones
        .where('actividadId').equals(actividadId)
        .filter(c => c.syncStatus !== 'synced')
        .count()
      ).pipe(
        switchMap(pendientesCount => {
           
           // 🛡️ ESTRATEGIA DE PROTECCIÓN:
           // Si hay notas pendientes de subir, NO confiamos en el servidor todavía.
           // Mostramos los datos locales (que son los más recientes) y dejamos que el SyncService trabaje en background.
           if (pendientesCount > 0) {
             console.log('⏳ [CalificacionService] Hay notas pendientes. Usando local para evitar conflictos.');
             return leerDesdeLocal();
           }

           // Si no hay pendientes, hacemos el flujo normal (API -> Local -> Vista)
           return this.http.get<PlanillaItem[]>(
             `${this.apiUrl}/planilla?gradoId=${gradoId}&actividadId=${actividadId}`
           ).pipe(
             switchMap(async (planillaServer) => {
                console.log('📡 [CalificacionService] Bajando planilla...');
                
                const notasParaGuardar = planillaServer
                    .filter(item => item.calificacionId != null)
                    .map(item => ({
                        id: item.calificacionId,
                        nota: item.nota,
                        observacion: item.observacion,
                        estudianteId: item.estudianteId,
                        actividadId: actividadId
                        // Sin syncStatus, el método Safe decide
                    }));

                if (notasParaGuardar.length > 0) {
                    await this.localDb.guardarCalificacionesServerSafe(notasParaGuardar);
                }
                
                return await this.construirPlanillaOffline(gradoId, actividadId);
             }),
             catchError(err => {
               console.warn('⚠️ Fallo API Planilla. Usando local.', err);
               return leerDesdeLocal();
             })
           );
        })
      );
    } else {
      return leerDesdeLocal();
    }
  }

  // Lógica manual para "unir" tablas cuando no tenemos SQL
  private async construirPlanillaOffline(gradoId: number, actividadId: number): Promise<PlanillaItem[]> {
    // 1. Obtener estudiantes del grado (Local)
    const estudiantes = await this.localDb.getEstudiantesPorGrado(gradoId);
    
    // 2. Obtener notas de la actividad (Local)
    // Estas pueden ser 'synced', 'create' o 'update'
    const notas = await this.localDb.getCalificacionesPorActividad(actividadId);
    
    // 3. Cruzar datos (Left Join: Estudiantes -> Notas)
    return estudiantes.map(est => {
      // Buscamos si este estudiante tiene nota.
      // Coincidencia por ID real (si existe) o ID local (si es nuevo)
      const nota = notas.find(n => 
        (est.id && n.estudianteId === est.id) || 
        (est.localId && n.estudianteId === est.localId)
      );

      return {
        estudianteId: est.id || est.localId!, // Usamos el ID disponible
        nombreEstudiante: est.nombre,
        apellidoEstudiante: est.apellido,
        // Si hay nota local, usamos sus datos
        calificacionId: nota ? (nota.id || nota.localId) : undefined,
        nota: nota ? nota.nota : undefined,
        observacion: nota ? nota.observacion : undefined
      };
    });
  }

  // ==========================================
  // 2. GUARDAR NOTA (Upsert)
  // ==========================================
  
  guardarCalificacion(request: CalificacionRequest, fromSync = false): Observable<any> {
    
    // Si viene del Sync, solo hacemos POST y retornamos (el SyncService se encarga de actualizar el estado local)
    if (fromSync) {
      return this.http.post(this.apiUrl, request);
    }

    const guardarLocal = () => {
      console.log('🔌 Guardando nota offline...');
      return from(this.localDb.guardarNotaOffline(request));
    };

    if (this.isOnline) {
      return this.http.post(this.apiUrl, request).pipe(
        tap(() => {
           // Éxito Online: Guardamos copia 'synced'
           this.localDb.guardarNotaOffline({
             ...request,
             syncStatus: 'synced'
          });
        }),
        catchError(err => {
            console.warn('⚠️ Error POST Nota API:', err);
            return guardarLocal();
        })
      );
    } else {
      return guardarLocal();
    }
  }

  // ==========================================
  // 3. BOLETÍN INDIVIDUAL (Para vista de estudiante)
  // ==========================================
  
  getCalificacionesPorEstudiante(estudianteId: number): Observable<Calificacion[]> {
    if (this.isOnline) {
      return this.http.get<Calificacion[]>(`${this.apiUrl}/estudiante/${estudianteId}`).pipe(
        tap(data => {
            // Guardar caché si se desea (opcional)
            this.localDb.guardarCalificacionesServerSafe(data);
        }),
        catchError(() => from(this.getLocalBoletin(estudianteId)))
      );
    } else {
      return from(this.getLocalBoletin(estudianteId));
    }
  }

  private async getLocalBoletin(estudianteId: number): Promise<Calificacion[]> {
     const notasLocales = await this.localDb.calificaciones
        .where('estudianteId').equals(estudianteId).toArray();
     
     // 🧹 FILTRO DE DUPLICADOS EN MEMORIA
     // Usamos un Map para quedarnos solo con UNA nota por actividad
     const notasUnicas = new Map();

     for (const n of notasLocales) {
        const existente = notasUnicas.get(n.actividadId);
        
        if (!existente) {
            // Si es la primera que vemos, la guardamos
            notasUnicas.set(n.actividadId, n);
        } else {
            // Si ya hay una, ¿cuál gana?
            // Gana la que tenga cambios pendientes ('create'/'update') sobre la 'synced'
            if (n.syncStatus !== 'synced' && existente.syncStatus === 'synced') {
                notasUnicas.set(n.actividadId, n);
            }
            // Si ambas son iguales, gana la que tenga el ID local más alto (la última editada)
            else if (n.localId! > existente.localId!) {
                notasUnicas.set(n.actividadId, n);
            }
        }
     }

     const resultado: Calificacion[] = [];

     // Iteramos sobre las notas ya filtradas
     for (const n of notasUnicas.values()) {
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
       }
     }
     return resultado;
  }
}