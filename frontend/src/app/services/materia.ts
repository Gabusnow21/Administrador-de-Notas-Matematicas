import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalDbService } from './local-db';
import { tap, catchError } from 'rxjs/operators';

export interface Materia {
  id: number;
  nombre: string;
  descripcion: string;
}

@Injectable({
  providedIn: 'root',
})

export class MateriaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/materias';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }


  // Obtener todas las materias
  getAll(): Observable<Materia[]> {
    if (this.isOnline) {
      return this.http.get<Materia[]>(this.apiUrl).pipe(
        tap(data => {
          // Guardamos catálogo fresco en local
          // (Para catálogos pequeños, guardarCatalogos limpia y reemplaza todo, lo cual es seguro)
          // Nota: guardarCatalogos espera (materias, trimestres), aquí solo actualizamos materias
          // por lo que usaremos una lógica directa de bulkPut o el método genérico si lo adaptamos.
          // Para no complicar, usaremos una transacción directa aquí:
          this.localDb.materias.clear().then(() => {
             const locales = data.map(m => ({ ...m, syncStatus: 'synced' as any }));
             this.localDb.materias.bulkAdd(locales);
          });
        }),
        catchError(() => from(this.localDb.getMaterias() as Promise<Materia[]>))
      );
    } else {
      return from(this.localDb.getMaterias() as Promise<Materia[]>);
    } 
  }

  // Crear una nueva materia
  crear(materia: Materia): Observable<Materia> {
    const guardarLocal = () => from(this.localDb.materias.add({ 
        ...materia, id: undefined, syncStatus: 'create' 
    }).then(() => materia));

    if (this.isOnline) {
      return this.http.post<Materia>(this.apiUrl, materia).pipe(
        tap(m => this.localDb.materias.put({ ...m, syncStatus: 'synced' })),
        catchError(() => guardarLocal())
      );
    } else {
      return guardarLocal();
    }
  }

  // Actualizar una materia existente
  actualizar(materia: Materia): Observable<Materia> {
    const actualizarLocal = () => from(
        this.localDb.materias.where('id').equals(materia.id!).modify({ ...materia, syncStatus: 'update' })
        .then(() => materia)
    );

    if (this.isOnline) {
      return this.http.put<Materia>(this.apiUrl, materia).pipe(
        tap(() => this.localDb.materias.where('id').equals(materia.id!).modify({ ...materia, syncStatus: 'synced' })),
        catchError(() => actualizarLocal())
      );
    } else {
      return actualizarLocal();
    }
  }

  // Eliminar una materia por ID
  borrar(id: number): Observable<void> {
    const borrarLocal = () => from(
        this.localDb.materias.where('id').equals(id).modify({ syncStatus: 'delete' }).then(() => undefined)
    );

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.localDb.materias.where('id').equals(id).delete()),
        catchError(() => borrarLocal())
      );
    } else {
      return borrarLocal();
    }
  }
  
}
