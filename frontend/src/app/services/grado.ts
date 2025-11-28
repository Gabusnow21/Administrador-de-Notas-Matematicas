import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Grado {
  id: number;
  nivel: string;    
  seccion: string;   
  anioEscolar: number;
}

@Injectable({
  providedIn: 'root',
})

export class GradoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/grados';

  constructor() { }

  //Obtener todos los grados
  getGrados(): Observable<Grado[]> {
    return this.http.get<Grado[]>(this.apiUrl);
  }
  
  //Crear un nuevo grado
  crearGrado(grado: any): Observable<any> {
    return this.http.post(this.apiUrl, grado);
  }

  //Actualizar un grado existente
  actualizarGrado(grado: Grado): Observable<Grado> {
    return this.http.put<Grado>(this.apiUrl, grado);
  }

  //Eliminar un grado por ID
  deleteGrado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  getGradoPorId(id: number): Observable<Grado> {
    return this.http.get<Grado>(`${this.apiUrl}/${id}`);
  }
  
}
