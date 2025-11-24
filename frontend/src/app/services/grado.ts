import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Grado {
  id: number;
  nivel: string;    
  seccion: string;   
  anioEscolar: number;
}

@Injectable({
  providedIn: 'root',
})

export class GradoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/grados';

  constructor() { }

  getGrados(): Observable<Grado[]> {
    return this.http.get<Grado[]>(this.apiUrl);
  }
  
}
