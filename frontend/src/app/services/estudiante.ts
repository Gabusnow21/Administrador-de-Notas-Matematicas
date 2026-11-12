import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService, LocalEstudiante } from './local-db';
import { environment } from '../environments/environment';

export interface Estudiante {
  id?: number;
  nombres: string;
  apellidos: string;
  email: string;
  gradoId: number;
  codigoProgreso: string;
  nfcId?: string;
  saldoTokens?: number;
  grado?: any;
  activo?: boolean;
  fechaEliminacion?: string;
  eliminadoPor?: number;
  localId?: number;
  syncStatus?: string;
}

export interface EstudianteDesactivado {
  id: number;
  nombres: string;
  apellidos: string;
  codigoProgreso: string;
  grado: string;
  fechaEliminacion?: string;
  eliminadoPorNombre?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EstudianteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/estudiantes`;
  private localDb = inject(LocalDbService);
  
  private estudianteActual: Estudiante | null = null;

  private get isOnline(): boolean {
    return navigator.onLine;
  }

  getEstudiantePorCodigo(codigo: string): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.apiUrl}/progreso/${codigo}`);
  }

  setEstudianteActual(estudiante: Estudiante): void {
    this.estudianteActual = estudiante;
  }

  getEstudianteActual(): Estudiante | null {
    const estudiante = this.estudianteActual;
    this.estudianteActual = null; // Clear after retrieving
    return estudiante;
  }

  getEstudiantesPorGrado(gradoId: number): Observable<Estudiante[]> {
    if (this.isOnline) {
      return this.http.get<Estudiante[]>(`${this.apiUrl}/grado/${gradoId}`).pipe(
        tap(data => {
          console.log('📡 [EstudianteService] Bajando datos frescos...');
          this.localDb.guardarEstudiantesServer(data, gradoId);
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
  
  getEstudiantesSinNfc(): Observable<Estudiante[]> {
    if (this.isOnline) {
      return this.http.get<Estudiante[]>(`${this.apiUrl}/sin-nfc`).pipe(
        catchError(err => {
          console.warn('⚠️ [EstudianteService] Fallo API para sin-nfc. Usando local.');
          return from(this.localDb.getEstudiantesSinNfc() as Promise<Estudiante[]>);
        })
      );
    } else {
      console.log('🔌 [EstudianteService] Offline. Usando local para sin-nfc.');
      return from(this.localDb.getEstudiantesSinNfc() as Promise<Estudiante[]>);
    } 
  }

  getEstudiantesInactivos(): Observable<EstudianteDesactivado[]> {
    return this.http.get<EstudianteDesactivado[]>(`${this.apiUrl}/inactivos`);
  }

  getEstudiantesInactivosPorGrado(gradoId: number): Observable<EstudianteDesactivado[]> {
    return this.http.get<EstudianteDesactivado[]>(`${this.apiUrl}/grado/${gradoId}/inactivos`);
  }

  restaurarEstudiante(id: number): Observable<Estudiante> {
    return this.http.patch<Estudiante>(`${this.apiUrl}/${id}/restaurar`, {});
  }

  createEstudiante(estudiante: any): Observable<Estudiante> {
        const guardarLocalmente = () => {
      console.log('🔌 [EstudianteService] Servidor no responde. Guardando Offline.');
      
      const estLocal: any = { 
        ...estudiante, 
        gradoId: estudiante.gradoId,
        id: null, 
        syncStatus: 'create' 
      };

      return from(this.localDb.estudiantes.add(estLocal).then((id: number) => {
        return { ...estudiante, localId: id, syncStatus: 'create' } as Estudiante;
      }));
    };

    if (this.isOnline) {
      return this.http.post<Estudiante>(this.apiUrl, estudiante).pipe(
        tap(e => {
          this.localDb.estudiantes.put({
            ...e,
            gradoId: estudiante.gradoId,
            syncStatus: 'synced' as const
          });
        }),
        catchError(err => {
          console.warn('⚠️ Error POST API:', err);
          if (err?.status === 0) {
            return guardarLocalmente();
          }
          return throwError(() => err);
        })
      );
    } else {
      return guardarLocalmente();
    }

  }

  getEstudianteById(id: number): Observable<Estudiante> {
    if (this.isOnline) {
      return this.http.get<Estudiante>(`${this.apiUrl}/${id}`).pipe(
        catchError(() => this.getLocalEstudiante(id))
      );
    } else {
      return this.getLocalEstudiante(id);
    }
  }

  private getLocalEstudiante(id: number): Observable<Estudiante> {
    return from(
      this.localDb.estudiantes.where('id').equals(id).first().then((result: LocalEstudiante | undefined) => {
        if (result) {
          return result as Estudiante;
        }
        else {
          throw new Error('Estudiante no encontrado en BD local');
        }
      })
    );
  }

  updateEstudiante(estudiante: Estudiante): Observable<any> {
    const id = estudiante.id;
    const localId = estudiante.localId;

    const actualizarLocalmente = () => {
        console.log('🔌 Actualizando localmente...');
        
        let query;
        if (id) {
            query = this.localDb.estudiantes.where('id').equals(id);
        } else if (localId) {
            query = this.localDb.estudiantes.where('localId').equals(localId);
        } else {
            return of(null); // Should not happen
        }

        return from(query.modify({
            ...estudiante,
            syncStatus: estudiante.syncStatus === 'create' ? 'create' : 'update'
        }).then(() => estudiante));
    };

    if (this.isOnline && id) {
      return this.http.put(`${this.apiUrl}/${id}`, estudiante).pipe(
        tap(() => {
           this.localDb.estudiantes.where('id').equals(id).modify({
             ...estudiante,
             syncStatus: 'synced' as const
            });
        }),
        catchError(err => {
            console.warn('⚠️ Error PUT API:', err);
            if (err?.status === 0) {
              return actualizarLocalmente();
            }
            return throwError(() => err);
        })
      );
    } else {
      return actualizarLocalmente();
    }
  }

  deleteEstudiante(estudiante: Estudiante): Observable<void> {
    const id = estudiante.id;
    const localId = estudiante.localId;

    const borrarLocalmente = () => {
        console.log('🔌 Borrando localmente...');
        let query;
        if (id) {
            query = this.localDb.estudiantes.where('id').equals(id);
        } else if (localId) {
            query = this.localDb.estudiantes.where('localId').equals(localId);
        } else {
            return of(); // Should not happen
        }

        if (estudiante.syncStatus === 'create') {
            return from(query.delete().then(() => {}));
        }

        return from(
            query.modify({ syncStatus: 'delete' as const })
            .then(() => {})
        );
    };

    if (this.isOnline && id) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => {
            let query;
            if (id) {
                query = this.localDb.estudiantes.where('id').equals(id);
            }
            else if (localId) {
                query = this.localDb.estudiantes.where('localId').equals(localId);
            }
            if (query) {
                query.delete();
            }
        }), 
        catchError(err => {
            console.warn('⚠️ Error DELETE API:', err);
            if (err?.status === 0) {
                return borrarLocalmente();
            }
            return throwError(() => err);
        })
      );
    } else {
      return borrarLocalmente();
    }
  }
}
