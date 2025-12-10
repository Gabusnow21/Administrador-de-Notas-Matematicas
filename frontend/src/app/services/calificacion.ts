import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { LocalCalificacion, LocalDbService, LocalEstudiante } from './local-db';

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
  actividad?: any;
  estudiante?: any;
  syncStatus?: string;
}

export interface CalificacionRequest {
  estudianteId: number;
  actividadId: number;
  nota: number;
  observacion: string;
}

@Injectable({ providedIn: 'root' })
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
          // Guardamos lo que bajamos del servidor
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

  // 👇 LÓGICA BLINDADA DE BÚSQUEDA 👇
  private async construirPlanillaOffline(gradoId: number, actividadId: number): Promise<PlanillaItem[]> {
    console.log(`🔍 [Offline] Generando Planilla. Grado: ${gradoId}, Actividad: ${actividadId}`);
    
    // 1. Estudiantes
    const estudiantes = await this.localDb.getEstudiantesPorGrado(Number(gradoId));
    
    // 2. Notas (FUERZA BRUTA: Traer todo y filtrar en RAM)
    const todasLasNotas = await this.localDb.calificaciones.toArray();
    
    // Filtrar manualmente asegurando tipos numéricos
    const notasRaw = todasLasNotas.filter((n: LocalCalificacion) => 
        Number(n.actividadId) === Number(actividadId)
    );

    console.log(`   -> Estudiantes: ${estudiantes.length}`);
    console.log(`   -> Total Notas en BD: ${todasLasNotas.length}`);
    console.log(`   -> Notas para esta actividad: ${notasRaw.length}`);

    // 3. Mapa para filtrar la "Mejor Nota"
    const mapaNotas = new Map<number, any>();

    notasRaw.forEach((nota: LocalCalificacion) => {
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
    return estudiantes.map((est: LocalEstudiante) => {
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
  // 2. GUARDAR NOTA
  // ==========================================
  guardarCalificacion(request: CalificacionRequest, fromSync = false): Observable<any> {
    if (fromSync) {
      return this.http.post(this.apiUrl, request);
    }

    const requestSeguro = {
        ...request,
        estudianteId: Number(request.estudianteId),
        actividadId: Number(request.actividadId),
        nota: Number(request.nota)
    };

    const guardarLocal = () => from(this.localDb.guardarNotaOffline(requestSeguro));

    if (this.isOnline) {
      return this.http.post(this.apiUrl, requestSeguro).pipe(
        tap(() => {
           this.localDb.guardarNotaOffline({ ...requestSeguro, syncStatus: 'synced' });
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
  // 3. SINCRONIZAR TODO
  // ==========================================
  sincronizarTodo(): Observable<any> {
    if (!this.isOnline) return from([]);

    return this.http.get<Calificacion[]>(`${this.apiUrl}/all`).pipe(
      tap(async (data) => {
        console.log(`📡 [Sync] Bajadas ${data.length} calificaciones.`);
        const notasPlanas = data.map(c => {
           const obj = c as any; 
           return {
             id: obj.id,
             nota: obj.nota,
             observacion: obj.observacion,
             estudianteId: Number(obj.estudiante ? obj.estudiante.id : obj.estudianteId),
             actividadId: Number(obj.actividad ? obj.actividad.id : obj.actividadId),
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
     const todasLasNotas = await this.localDb.calificaciones.toArray();
     const notasFiltradas = todasLasNotas.filter((n: LocalCalificacion) => Number(n.estudianteId) === Number(estudianteId));

     const resultado: Calificacion[] = [];
     for (const n of notasFiltradas) {
       let actividad = await this.localDb.actividades.where('id').equals(n.actividadId).first();
       if (!actividad) actividad = await this.localDb.actividades.get(n.actividadId);
       
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