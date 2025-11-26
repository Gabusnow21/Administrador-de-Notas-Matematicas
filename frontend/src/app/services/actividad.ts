import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Actividad {
  id: number;
  nombre: string;
  descripcion: string;
  fechaEntrega: Date;
  materiaId: number;
  trimestreId: number;
  porcentaje: number;
}

@Injectable({
  providedIn: 'root',
})

export class Actividad {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/actividades';

  // Obtener todas las actividades
  getAll(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(this.apiUrl);
  }

  // Obtener actividades por materia y trimestre
  getByMateriaAndTrimestre(materiaId: number, trimestreId: number): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(
      `${this.apiUrl}?materiaId=${materiaId}&trimestreId=${trimestreId}`
    );
  }
}
