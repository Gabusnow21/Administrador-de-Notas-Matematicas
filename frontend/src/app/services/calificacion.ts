import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { get } from 'http';
import { LocalDbService } from './local-db';
import { tap, catchError } from 'rxjs/operators';

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
  // 1. OBTENER BOLETÍN (Individual)
  // ==========================================
  //Obtener calificaciones de un estudiante
  getCalificacionesPorEstudiante(estudianteId: number): Observable<Calificacion[]> {
      if (this.isOnline) {
      return this.http.get<Calificacion[]>(`${this.apiUrl}/estudiante/${estudianteId}`).pipe(
        tap(data => {
          console.log('📡 [CalificacionService] Bajando boletín fresco...');
          // Aquí podríamos guardar en local si quisiéramos caché de lectura
          this.localDb.guardarCalificacionesServer(data);
        }),
        catchError(err => {
          console.warn('⚠️ [CalificacionService] Fallo API. Usando local.');
          return this.getLocalBoletin(estudianteId);
        })
      );
    } else {
      console.log('🔌 [CalificacionService] Offline. Leyendo notas locales.');
      return this.getLocalBoletin(estudianteId);
    }
  }

  // Helper para obtener notas locales formateadas como las espera el componente
  private getLocalBoletin(estudianteId: number): Observable<Calificacion[]> {
    return from(
      this.localDb.calificaciones.where('estudianteId').equals(estudianteId).toArray().then(async (notasLocales) => {
        // Enriquecer las notas con datos de Actividad (joins manuales)
        const resultado: Calificacion[] = [];
        
        for (const n of notasLocales) {
          const actividad = await this.localDb.actividades.get(n.actividadId);
          // Si no encontramos la actividad localmente, no podemos mostrar la nota bien
          if (actividad) {
             // Simulamos la estructura anidada que devuelve el backend
             resultado.push({
               id: n.id,
               nota: n.nota,
               observacion: n.observacion,
               localId: n.localId,
               syncStatus: n.syncStatus,
               actividad: {
                 id: actividad.id!,
                 nombre: actividad.nombre,
                 ponderacion: actividad.ponderacion,
                 trimestre: { nombre: 'Cargado Offline' } // Simplificación
               }
             });
          }
        }
        return resultado;
      })
    );
  }

  //Guardar calificacion
  guardarCalificacion(request: CalificacionRequest): Observable<any> {
     // Función reutilizable para guardar en Dexie
    const guardarOffline = () => {
      console.log('🔌 [CalificacionService] Guardando nota en BD Local...');
      return from(this.localDb.guardarNotaOffline(request));
    };

    if (this.isOnline) {
      return this.http.post(this.apiUrl, request).pipe(
        tap(() => {
          // ÉXITO ONLINE: Guardamos copia 'synced' en local
          this.localDb.guardarNotaOffline({
             ...request,
             syncStatus: 'synced'
          });
        }),
        // 🛡️ PARACAÍDAS: Si falla el POST (ej. servidor apagado), guardamos local
        catchError(err => {
          console.warn('⚠️ Error POST API:', err);
          return guardarOffline();
        })
      );
    } else {
      // MODO OFFLINE: Directo a local
      return guardarOffline();
    } 
  }

  
  //Obtener planilla de calificaciones para un grado y actividad
  obtenerPlanilla(gradoId: number, actividadId: number): Observable<PlanillaItem[]> {
    if (this.isOnline) {
      return this.http.get<PlanillaItem[]>(
        `${this.apiUrl}/planilla?gradoId=${gradoId}&actividadId=${actividadId}`
      ).pipe(
        catchError(() => from(this.construirPlanillaOffline(gradoId, actividadId)))
      );
    } else {
      console.log('🔌 [CalificacionService] Planilla Offline.');
      return from(this.construirPlanillaOffline(gradoId, actividadId));
    }
  }

    // Lógica manual para "unir" tablas cuando no tenemos SQL (Offline)
  private async construirPlanillaOffline(gradoId: number, actividadId: number): Promise<PlanillaItem[]> {
    const estudiantes = await this.localDb.getEstudiantesPorGrado(gradoId);
    const notas = await this.localDb.getCalificacionesPorActividad(actividadId);
    
    return estudiantes.map(est => {
      // Buscamos nota por ID real o local
      const nota = notas.find(n => 
        (est.id && n.estudianteId === est.id) || 
        (est.localId && n.estudianteId === est.localId)
      );

      return {
        estudianteId: est.id || est.localId!,
        nombreEstudiante: est.nombre,
        apellidoEstudiante: est.apellido,
        calificacionId: nota ? (nota.id || nota.localId) : undefined,
        nota: nota ? nota.nota : undefined,
        observacion: nota ? nota.observacion : undefined
      };
    });  
  }
}