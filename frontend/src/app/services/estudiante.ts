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
        const guardarLocalmente = () => {
      console.log('🔌 [EstudianteService] Servidor no responde. Guardando Offline.');
      
      // 👇 CORRECCIÓN: Definimos el objeto local explícitamente como any
      const estLocal: any = { 
        ...estudiante, 
        gradoId: estudiante.gradoId,
        id: null, 
        syncStatus: 'create' 
      };

      return from(this.localDb.estudiantes.add(estLocal).then(id => {
        return { ...estudiante, localId: id, syncStatus: 'create' } as Estudiante;
      }));
    };

    if (this.isOnline) {
      return this.http.post<Estudiante>(this.apiUrl, estudiante).pipe(
        tap(e => {
          // Éxito Online: Guardamos en local marcado como 'synced'
          this.localDb.estudiantes.put({ 
            ...e, 
            gradoId: estudiante.gradoId,
            syncStatus: 'synced' 
          } as any);
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
    return from(
      this.localDb.estudiantes.where('id').equals(id).first().then(result => {
        if (result) {
          // Convertimos a 'any' primero para evitar conflicto de tipos entre LocalEstudiante y Estudiante
          return result as any as Estudiante;
        } else {
          throw new Error('Estudiante no encontrado en BD local');
        }
      })
    );
  }

  //Actualizar estudiante
  updateEstudiante(id: number, estudiante: any): Observable<any> {
    const actualizarLocalmente = () => {
        console.log('🔌 Actualizando localmente...');
        return from(this.localDb.estudiantes.where('id').equals(id).modify({
            ...estudiante, 
            syncStatus: 'update'
        } as any).then(() => estudiante));
    };

    if (this.isOnline) {
      return this.http.put(`${this.apiUrl}/${id}`, estudiante).pipe(
        tap(() => {
           this.localDb.estudiantes.where('id').equals(id).modify({ 
             ...estudiante, 
             syncStatus: 'synced' 
            } as any);
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

  //Eliminar estudiante
  deleteEstudiante(id: number): Observable<void> {
    const borrarLocalmente = () => {
        console.log('🔌 Borrando localmente...');
        return from(
            this.localDb.estudiantes.where('id').equals(id)
            .modify({ syncStatus: 'delete' } as any)
            .then(() => {}) // 👇 CORRECCIÓN: Forzamos el retorno void
        );
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.localDb.estudiantes.where('id').equals(id).delete()), 
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
