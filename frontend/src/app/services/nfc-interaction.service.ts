import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Estudiante } from './estudiante';
import { environment } from '../environments/environment';

export interface TransaccionPayload {
  nfcId: string;
  monto: number;
  descripcion: string;
  tipo: 'ACUMULACION' | 'CANJE';
}

@Injectable({
  providedIn: 'root'
})
export class NfcInteractionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nfc`;

  getEstudiantePorNfcId(nfcId: string): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.apiUrl}/estudiante/${nfcId}`);
  }

  asignarNfcAEstudiante(estudianteId: number, nfcId: string): Observable<Estudiante> {
    const payload = { estudianteId: String(estudianteId), nfcId };
    return this.http.post<Estudiante>(`${this.apiUrl}/asignar`, payload);
  }

  realizarTransaccion(payload: TransaccionPayload): Observable<Estudiante> {
    // El payload para el backend espera strings, hacemos la conversión necesaria
    const backendPayload = {
      nfcId: payload.nfcId,
      monto: String(payload.monto),
      descripcion: payload.descripcion,
      tipo: payload.tipo
    };
    return this.http.post<Estudiante>(`${this.apiUrl}/transaccion`, backendPayload);
  }
}
