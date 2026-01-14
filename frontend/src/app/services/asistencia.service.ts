import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Estudiante } from './estudiante';

export enum EstadoAsistencia {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  TARDE = 'TARDE',
  EXCUSA = 'EXCUSA'
}

export interface Asistencia {
  id?: number;
  estudiante: Estudiante;
  fecha: string; // ISO Date YYYY-MM-DD
  estado: EstadoAsistencia;
  observacion?: string;
}

export interface AsistenciaRequest {
    estudianteId: number;
    fecha: string;
    estado: EstadoAsistencia;
    observacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/asistencia`;

  getAsistenciaByGradoAndFecha(gradoId: number, fecha: string): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`${this.apiUrl}/grado/${gradoId}/fecha/${fecha}`);
  }

  registrarAsistencia(request: AsistenciaRequest): Observable<Asistencia> {
    return this.http.post<Asistencia>(this.apiUrl, request);
  }

  registrarAsistenciaPorNfc(nfcId: string): Observable<Asistencia> {
    return this.http.post<Asistencia>(`${this.apiUrl}/nfc`, { nfcId });
  }
}
