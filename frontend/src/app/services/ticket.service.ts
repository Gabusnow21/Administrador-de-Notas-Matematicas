import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  validateTicket(studentListNumber: number): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/tickets/validate`, { studentListNumber });
  }

  generateTickets(): Observable<any> {
    return this.http.post(`${this.apiUrl}/tickets/generate`, {});
  }

  getDownloadUrl(token: string): string {
    return `${this.apiUrl}/download/${token}`;
  }

  getConfigPath(): Observable<{ path: string }> {
    return this.http.get<{ path: string }>(`${this.apiUrl}/tickets/config/path`);
  }

  setConfigPath(path: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tickets/config/path`, { path });
  }

  listDirectories(path: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.apiUrl}/tickets/config/list-dirs`, { path });
  }
}
