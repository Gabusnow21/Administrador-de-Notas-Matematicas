import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalDbService, SyncStatus } from './local-db';
import { tap, catchError } from 'rxjs/operators';

export interface Materia {
  id: number;
  localId?: number;
  nombre: string;
  descripcion: string;
  syncStatus?: string;
}

@Injectable({
  providedIn: 'root',
})

export class MateriaService {
  private http = inject(HttpClient);
  private apiUrl = 'environment.apiUrl' + '/api/materias';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }


  // Obtener todas las materias
  getAll(): Observable<Materia[]> {
    if (this.isOnline) {
      return this.http.get<Materia[]>(this.apiUrl).pipe(
        tap(data => {
          // Actualizamos caché local
          this.localDb.transaction('rw', this.localDb.materias, async () => {
             await this.localDb.materias.clear();
             const locales = data.map(m => ({ ...m, syncStatus: 'synced' as const }));
             await this.localDb.materias.bulkAdd(locales);
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
    const guardarLocal = () => {
        console.log('🔌 [MateriaService] Guardando offline...');
        const matLocal = {
            ...materia,
            syncStatus: 'create' as const
        };
        return from(this.localDb.materias.add(matLocal).then((localId) => ({
            ...matLocal,
            localId
        } as Materia)));
    };

    if (this.isOnline) {
      return this.http.post<Materia>(this.apiUrl, materia).pipe(
        tap(m => this.localDb.materias.put({ ...m, syncStatus: 'synced' as const })),
        catchError(() => guardarLocal())
      );
    } else {
      return guardarLocal();
    }
  }

  // Actualizar una materia existente
  actualizar(materia: Materia): Observable<Materia> {
    const actualizarLocal = async () => {
        console.log('🔌 [MateriaService] Actualizando offline...');

        let registro;
        // Buscamos por ID servidor o por LocalID
        if (materia.id) {
            registro = await this.localDb.materias.where('id').equals(materia.id).first();
        } else if (materia.localId) {
            registro = await this.localDb.materias.get(materia.localId);
        }

        if (registro) {
            const newSyncStatus: SyncStatus = registro.syncStatus === 'create' ? 'create' : 'update';
            await this.localDb.materias.update(registro.localId!, {
                ...materia,
                // Si era 'create', se queda 'create'. Si era 'synced', pasa a 'update'
                syncStatus: newSyncStatus
            });
            return materia;
        }
        throw new Error('Materia no encontrada localmente');
    };

    if (this.isOnline) {
      return this.http.put<Materia>(this.apiUrl, materia).pipe(
        tap(m => {
           if (m.id) {
             this.localDb.materias.where('id').equals(m.id).modify({ ...m, syncStatus: 'synced' as const });
           }
        }),
        catchError(() => from(actualizarLocal()))
      );
    } else {
      return from(actualizarLocal());
    }
  }

  // Eliminar una materia por ID
  borrar(id: number): Observable<void> {
    const borrarLocal = async () => {
        console.log('🔌 [MateriaService] Borrando offline...');

        // Intentar buscar por ID servidor
        let registro = await this.localDb.materias.where('id').equals(id).first();

        // Si no, intentar asumir que el 'id' que nos pasaron es un 'localId' (caso borde)
        if (!registro) {
            registro = await this.localDb.materias.get(id);
        }

        if (registro) {
            if (registro.syncStatus === 'create') {
                // Nunca subió, borrar físico
                await this.localDb.materias.delete(registro.localId!);
            } else {
                // Ya existía, borrado lógico
                await this.localDb.materias.update(registro.localId!, { syncStatus: 'delete' as const });
            }
        }
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.localDb.materias.where('id').equals(id).delete()),
        catchError(() => from(borrarLocal()))
      );
    } else {
      return from(borrarLocal());
    }
  }
  
}
