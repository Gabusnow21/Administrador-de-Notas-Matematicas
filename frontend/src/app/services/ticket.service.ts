import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Estructura plana que entrega el backend para generar la boleta con jsPDF.
// Espeja BoletaDataDTO del backend (dev.gabus.dto.Ticket).
export interface BoletaData {
  estudiante: {
    nombres: string;
    apellidos: string;
    codigoProgreso: string;
  };
  calificaciones: { nota: number; actividadId: number }[];
  actividades: { id: number; nombre: string; ponderacion: number; materiaId: number; trimestreId: number }[];
  materias: { id: number; nombre: string }[];
  trimestres: { id: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  checkNie(nie: string): Observable<{ available: boolean; nombre?: string; message: string }> {
    return this.http.get<{ available: boolean; nombre?: string; message: string }>(
      `${this.apiUrl}/tickets/check-nie/${nie}`
    );
  }

  getDownloadUrl(nie: string): string {
    return `${this.apiUrl}/tickets/download/${nie}`;
  }

  getBoletaData(nie: string): Observable<BoletaData> {
    return this.http.get<BoletaData>(`${this.apiUrl}/tickets/data/${nie}`);
  }
}
