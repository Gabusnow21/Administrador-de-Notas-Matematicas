import  {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService } from './local-db';

export interface Trimestre {
  id: number;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  anioEscolar: number;
  estado:boolean;
  localId?: number;
  syncStatus?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TrimestreService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/trimestres';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }

  // Obtener todos los trimestres
  getAll(): Observable<Trimestre[]> {
    if (this.isOnline) {
      return this.http.get<Trimestre[]>(this.apiUrl).pipe(
        tap(data => {
          this.localDb.trimestres.clear().then(() => {
             const locales = data.map(t => ({
               ...t,
               fechaInicio: (t.fechaInicio as any)?.toString(),
               fechaFin: (t.fechaFin as any)?.toString(),
               syncStatus: 'synced' as any
             }));
             this.localDb.trimestres.bulkAdd(locales);
          });
        }),
        catchError(() => from(this.localDb.getTrimestres().then(locales =>
          locales.map(local => ({
            id: typeof local.id === 'number' ? local.id : 0,
            nombre: local.nombre,
            fechaInicio: new Date(local.fechaInicio ?? ''),
            fechaFin: new Date(local.fechaFin ?? ''),
            anioEscolar: local.anioEscolar,
            estado: 'estado' in local ? (local as any).estado ?? false : false, // handle missing property
            localId: typeof local.localId === 'number' ? local.localId : undefined,
            syncStatus: local.syncStatus
          })) as Trimestre[]
        )))
      );
    } else {
      return from(this.localDb.getTrimestres().then(locales =>
        locales.map(local => ({
          id: typeof local.id === 'number' ? local.id : 0,
          nombre: local.nombre,
          fechaInicio: new Date(local.fechaInicio ?? ''),
          fechaFin: new Date(local.fechaFin ?? ''),
          anioEscolar: local.anioEscolar,
          estado: 'estado' in local ? (local as any).estado ?? false : false, // handle missing property
          localId: typeof local.localId === 'number' ? local.localId : undefined,
          syncStatus: local.syncStatus
        }))
      ));
    }
  }
  
}
