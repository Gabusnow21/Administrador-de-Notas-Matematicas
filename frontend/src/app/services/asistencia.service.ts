import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Asistencia, AsistenciaRequest } from './asistencia';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/asistencia`;

  registrarAsistencia(request: AsistenciaRequest): Observable<Asistencia> {
    return this.http.post<Asistencia>(`${this.apiUrl}/registrar`, request);
  }

  getAsistenciaPorGrado(gradoId: number, fecha?: string): Observable<Asistencia[]> {
    let url = `${this.apiUrl}/grado/${gradoId}`;
    if (fecha) {
        url += `?fecha=${fecha}`;
    }
    return this.http.get<Asistencia[]>(url);
  }

  getHistorialEstudiante(estudianteId: number): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`${this.apiUrl}/estudiante/${estudianteId}`);
  }
}
