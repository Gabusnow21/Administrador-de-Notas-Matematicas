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

  checkNie(nie: string): Observable<{ available: boolean; nombre?: string; message: string }> {
    return this.http.get<{ available: boolean; nombre?: string; message: string }>(
      `${this.apiUrl}/tickets/check-nie/${nie}`
    );
  }

  getDownloadUrl(nie: string): string {
    return `${this.apiUrl}/tickets/download/${nie}`;
  }
}
