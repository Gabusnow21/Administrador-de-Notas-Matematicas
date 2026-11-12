import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export type TipoRegistro = 'PROFESOR' | 'ESTUDIANTE';
export type AccionBaja = 'DESACTIVACION' | 'RESTAURACION';

export interface AuditoriaBaja {
  id: number;
  tipo: TipoRegistro;
  registroId: number;
  nombreRegistro: string;
  accion: AccionBaja;
  fecha: string;
  ejecutadoPorId: number;
  ejecutadoPorNombre: string;
}

export interface AuditoriaPage {
  content: AuditoriaBaja[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface FiltrosAuditoria {
  tipo?: TipoRegistro | '';
  accion?: AccionBaja | '';
  desde?: string;
  hasta?: string;
  buscar?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuditoriaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auditoria`;

  getHistorial(filtros: FiltrosAuditoria = {}): Observable<AuditoriaPage> {
    let params = new HttpParams();

    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.buscar?.trim()) params = params.set('buscar', filtros.buscar.trim());
    params = params.set('page', String(filtros.page ?? 0));
    params = params.set('size', String(filtros.size ?? 20));

    return this.http.get<AuditoriaPage>(`${this.apiUrl}/bajas`, { params });
  }
}
