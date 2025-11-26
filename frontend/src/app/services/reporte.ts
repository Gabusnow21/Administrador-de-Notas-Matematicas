import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Reporte {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/reportes';

  descargarBoletin(estudianteId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/boletin/${estudianteId}`, {
      responseType: 'blob' // Dice a Angular que no espere JSON
    });
  }
  
}
