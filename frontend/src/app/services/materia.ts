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
  
}
