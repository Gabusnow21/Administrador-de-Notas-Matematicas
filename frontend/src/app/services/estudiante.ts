import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



export interface Estudiante {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  gradoId: number;
  
}
@Injectable({
  providedIn: 'root',
})
export class EstudianteService {
  //Variables
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/estudiantes';

  // Obtener estudiantes de un grado específico
  getEstudiantesPorGrado(gradoId: number): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(`${this.apiUrl}/grado/${gradoId}`);
  }
  
  // Crear estudiante (nos servirá pronto)
  createEstudiante(estudiante: any): Observable<Estudiante> {
    return this.http.post<Estudiante>(this.apiUrl, estudiante);
  }
  getEstudianteById(id: number): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.apiUrl}/${id}`);
  }
  //Actualizar estudiante
  updateEstudiante(id: number, estudiante: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, estudiante);
  }

  //Eliminar estudiante
  deleteEstudiante(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
