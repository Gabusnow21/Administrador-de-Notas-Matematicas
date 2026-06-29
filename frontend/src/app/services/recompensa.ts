import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Usuario } from './usuario';

export interface Recompensa {
  id?: number;
  nombre: string;
  descripcion: string;
  costo: number;
  stock?: number;
  imagenUrl?: string;
  profesor?: Usuario;
}

@Injectable({
  providedIn: 'root'
})
export class RecompensaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/recompensas`;

  getRecompensas(): Observable<Recompensa[]> {
    return this.http.get<Recompensa[]>(this.apiUrl);
  }

  createRecompensa(recompensa: Recompensa): Observable<Recompensa> {
    return this.http.post<Recompensa>(this.apiUrl, recompensa);
  }

  updateRecompensa(id: number, recompensa: Recompensa): Observable<Recompensa> {
    return this.http.put<Recompensa>(`${this.apiUrl}/${id}`, recompensa);
  }

  deleteRecompensa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
