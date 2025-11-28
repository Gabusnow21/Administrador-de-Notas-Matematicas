import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Materia {
  id: number;
  nombre: string;
  descripcion: string;
}

@Injectable({
  providedIn: 'root',
})

export class Materia {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/materias';


  // Obtener todas las materias
  getAll(): Observable<Materia[]> {
    return this.http.get<Materia[]>(this.apiUrl);
  }

  // Crear una nueva materia
  crear(materia: Materia): Observable<Materia> {
    return this.http.post<Materia>(this.apiUrl, materia);
  }

  // Actualizar una materia existente
  actualizar(materia: Materia): Observable<Materia> {
    return this.http.put<Materia>(this.apiUrl, materia);
  }

  // Eliminar una materia por ID
  borrar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  
}
