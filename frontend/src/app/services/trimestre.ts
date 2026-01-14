import  {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService } from './local-db';
import { environment } from '../environments/environment';

export interface Trimestre {
  id: number;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  anioEscolar: number;
  activo: boolean;
  localId?: number;
  syncStatus?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TrimestreService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/trimestres`;
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
              estaActivo: t.activo,
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
            activo: local.estaActivo ?? false,
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
          activo: local.estaActivo ?? false,
          localId: local.localId,
          syncStatus: local.syncStatus
        }))
      ));
    }
  }

  crear(trimestre: Partial<Trimestre>): Observable<Trimestre> {
    if (this.isOnline) {
      return this.http.post<Trimestre>(this.apiUrl, trimestre).pipe(
        tap(async (created) => {
          await this.localDb.trimestres.add({
            id: created.id,
            nombre: created.nombre,
            fechaInicio: created.fechaInicio.toString(),
            fechaFin: created.fechaFin.toString(),
            anioEscolar: created.anioEscolar,
            estaActivo: created.activo,
            syncStatus: 'synced'
          });
        })
      );
    } else {
      // Offline: crear localmente
      return from(this.localDb.trimestres.add({
          nombre: trimestre.nombre!,
          fechaInicio: trimestre.fechaInicio!.toString(),
          fechaFin: trimestre.fechaFin!.toString(),
          anioEscolar: trimestre.anioEscolar!,
          estaActivo: trimestre.activo!,
          syncStatus: 'create'
      }).then((id: number) => ({ ...trimestre, localId: id } as Trimestre)));
    }
  }

  actualizar(trimestre: Trimestre): Observable<Trimestre> {
    if (this.isOnline) {
      return this.http.put<Trimestre>(this.apiUrl, trimestre).pipe(
        tap(async (updated) => {
          await this.localDb.trimestres.where('id').equals(updated.id).modify({
             nombre: updated.nombre,
             fechaInicio: updated.fechaInicio.toString(),
             fechaFin: updated.fechaFin.toString(),
             anioEscolar: updated.anioEscolar,
             estaActivo: updated.activo,
             syncStatus: 'synced'
          });
        })
      );
    } else {
       // Offline logic placeholder
       return throwError(() => new Error('Edición offline no implementada completamente'));
    }
  }

  borrar(id: number): Observable<void> {
    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(async () => {
          await this.localDb.trimestres.where('id').equals(id).delete();
        })
      );
    } else {
      return throwError(() => new Error('Borrado offline no implementado'));
    }
  }
  
}
