import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  generarReporteMensual(gradoId: number, month: number, year: number): Observable<Blob> {
    const params = new HttpParams()
      .set('gradoId', gradoId.toString())
      .set('month', month.toString())
      .set('year', year.toString());
    
    return this.http.get(`${this.apiUrl}/reporte/mensual`, {
      params,
      responseType: 'blob'
    });
  }
}
