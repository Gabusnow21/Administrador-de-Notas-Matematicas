import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService } from './local-db';

export interface Estudiante {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  gradoId: number;
  grado?: any;   // Objeto completo si viene del API
  localId?: number;
  syncStatus?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EstudianteService {
  //Variables
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/estudiantes';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean {
  return navigator.onLine;
  }


  // Obtener estudiantes de un grado específico
  getEstudiantesPorGrado(gradoId: number): Observable<Estudiante[]> {
    if (this.isOnline) {
      return this.http.get<Estudiante[]>(`${this.apiUrl}/grado/${gradoId}`).pipe(
        tap(data => {
          console.log('📡 [EstudianteService] Bajando datos frescos...');
          this.localDb.guardarEstudiantesServer(data);
        }),
        catchError(err => {
          console.warn('⚠️ [EstudianteService] Fallo API. Usando local.');
          return from(this.localDb.getEstudiantesPorGrado(gradoId) as Promise<Estudiante[]>);
        })
      );
    } else {
      console.log('🔌 [EstudianteService] Offline. Usando local.');
      return from(this.localDb.getEstudiantesPorGrado(gradoId) as Promise<Estudiante[]>);
    } 
  }
  
  // Crear estudiante (nos servirá pronto)
  createEstudiante(estudiante: any): Observable<Estudiante> {
    if (this.isOnline) {
      return this.http.post<Estudiante>(this.apiUrl, estudiante).pipe(
        tap(e => {
          // Guardar copia synced (asegurando formato plano para la BD local)
          this.localDb.estudiantes.put({ 
            ...e, 
            gradoId: estudiante.gradoId, // Usamos el ID que enviamos
            syncStatus: 'synced' 
          });
        })
      );
    } else {
      console.log('🔌 [EstudianteService] Guardando offline...');
      return from(this.localDb.addEstudianteOffline(estudiante).then(id => {
        return { ...estudiante, localId: id, syncStatus: 'create' };
      }));
    }
  }

  // Obtener estudiante por ID
  getEstudianteById(id: number): Observable<Estudiante> {
    if (this.isOnline) {
      return this.http.get<Estudiante>(`${this.apiUrl}/${id}`).pipe(
        catchError(() => this.getLocalEstudiante(id))
      );
    } else {
      return this.getLocalEstudiante(id);
    }
  }
  // Obtener estudiante local por ID
  private getLocalEstudiante(id: number): Observable<Estudiante> {
    // Buscamos por ID de servidor primero
    return from(this.localDb.estudiantes.where('id').equals(id).first() as unknown as Promise<Estudiante>);
  }

  //Actualizar estudiante
  updateEstudiante(id: number, estudiante: any): Observable<any> {
    if (this.isOnline) {
      return this.http.put(`${this.apiUrl}/${id}`, estudiante).pipe(
        tap(() => {
           // Actualizar localmente si existe por ID servidor
           this.localDb.estudiantes.where('id').equals(id).modify({ ...estudiante, syncStatus: 'synced' });
        })
      );
    } else {
      // Lógica Update Offline (Compleja: requiere buscar por ID server o localId)
      // Por simplicidad en Fase 3, asumimos actualización sobre registro sincronizado
      return from(this.localDb.estudiantes.where('id').equals(id).modify({
        ...estudiante, 
        syncStatus: 'update'
      }));
    }
  }

  //Eliminar estudiante
  deleteEstudiante(id: number): Observable<void> {
    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.localDb.estudiantes.where('id').equals(id).delete())
      );
    } else {
      return from(this.localDb.estudiantes.where('id').equals(id).modify({ syncStatus: 'delete' }).then(() => {}));
    }
  }
}
