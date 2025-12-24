import  {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService } from './local-db';
import { environment } from '../environments/environment.prod';

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
  private apiUrl = `${environment.apiUrl}/api/trimestres`;
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }

  // Obtener todos los trimestres
  getAll(): Observable<Trimestre[]> {
    if (this.isOnline) {
      return this.http.get<Trimestre[]>(this.apiUrl).pipe(
        tap(data => {
          // ✅ Usar transacción atómica para integridad de datos
          this.localDb.transaction('rw', this.localDb.trimestres, async () => {
            await this.localDb.trimestres.clear();
            const locales = data.map(t => ({
              ...t,
              fechaInicio: t.fechaInicio?.toString(),
              fechaFin: t.fechaFin?.toString(),
              estaActivo: t.estado,
              syncStatus: 'synced' as const
            }));
            await this.localDb.trimestres.bulkAdd(locales);
          });
        }),
        catchError(() => from(this.localDb.getTrimestres().then(locales =>
          locales.map(local => ({
            id: local.id ?? 0,
            nombre: local.nombre,
            fechaInicio: new Date(local.fechaInicio ?? ''),
            fechaFin: new Date(local.fechaFin ?? ''),
            anioEscolar: local.anioEscolar,
            estado: local.estaActivo ?? false,
            localId: local.localId,
            syncStatus: local.syncStatus
          })) as Trimestre[]
        )))
      );
    } else {
      return from(this.localDb.getTrimestres().then(locales =>
        locales.map(local => ({
          id: local.id ?? 0,
          nombre: local.nombre,
          fechaInicio: new Date(local.fechaInicio ?? ''),
          fechaFin: new Date(local.fechaFin ?? ''),
          anioEscolar: local.anioEscolar,
          estado: local.estaActivo ?? false,
          localId: local.localId,
          syncStatus: local.syncStatus
        }))
      ));
    }
  }
  
}
