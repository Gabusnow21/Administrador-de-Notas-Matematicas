import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { get } from 'http';

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

  // Aquí puedes agregar métodos para interactuar con la API de calificaciones
  getCalificacionesPorEstudiante(estudianteId: number): Observable<Calificacion[]> {
    return this.http.get<Calificacion[]>(`${this.apiUrl}/estudiante/${estudianteId}`);
  }

  //Guardar calificacion
  guardarCalificacion(request: CalificacionRequest): Observable<any> {
    return this.http.post(this.apiUrl, request);
  }
}