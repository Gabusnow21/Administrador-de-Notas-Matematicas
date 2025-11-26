import  {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Trimestre {
  id: number;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  anioEscolar: number;
  estado:boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Trimestre {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/trimestres';

  // Obtener todos los trimestres
  getAll(): Observable<Trimestre[]> {
    return this.http.get<Trimestre[]>(this.apiUrl);
  }
  
}
