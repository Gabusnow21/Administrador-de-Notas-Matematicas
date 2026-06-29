import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/configuracion`;

  getTokenName(): Observable<string> {
    // El backend devuelve el nombre directamente como un string
    return this.http.get(this.apiUrl + '/token-name', { responseType: 'text' });
  }

  setTokenName(name: string): Observable<any> {
    return this.http.post(this.apiUrl + '/token-name', name, { responseType: 'text' });
  }
}
