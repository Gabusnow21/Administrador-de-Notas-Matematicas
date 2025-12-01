import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalDbService } from './local-db';

export interface Usuario {
  id?: number;
  localId?: number; // Para uso en LocalDbService
  nombre: string;
  apellido: string;
  username: string; // Email
  password?: string; 
  role: string;   
  syncStatus?: string;   
}

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/usuarios';
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }

  // 1. Obtener lista
  getAll(): Observable<Usuario[]> {
    if (this.isOnline) {
      return this.http.get<Usuario[]>(this.apiUrl).pipe(
        tap(data => {
          console.log('📡 [UsuarioService] Actualizando usuarios locales...');
          this.localDb.guardarUsuariosServer(data);
        }),
        catchError(err => {
          console.warn('⚠️ Fallo API Usuarios. Usando local.');
          // Filtramos los que no estén marcados como eliminados
          return from(this.localDb.usuarios.filter(u => u.syncStatus !== 'delete').toArray() as Promise<Usuario[]>);
        })
      );
    } else {
      console.log('🔌 Offline. Leyendo usuarios locales.');
      return from(this.localDb.usuarios.filter(u => u.syncStatus !== 'delete').toArray() as Promise<Usuario[]>);
    }
    }

  // 2. Crear nuevo (Backend encriptará la password)
crear(usuario: Usuario, fromSync = false): Observable<Usuario> {
    // Si viene del Sync, queremos que falle si no hay red, NO que guarde local otra vez
    if (fromSync) {
      return this.http.post<Usuario>(this.apiUrl, usuario);
    }

    const guardarLocal = () => {
      console.log('🔌 Guardando usuario offline...');
      const userLocal: any = { ...usuario, id: null, syncStatus: 'create' };
      return from(this.localDb.usuarios.add(userLocal).then(() => userLocal));
    };

    if (this.isOnline) {
      return this.http.post<Usuario>(this.apiUrl, usuario).pipe(
        tap(u => this.localDb.usuarios.put({ ...u, syncStatus: 'synced' } as any)),
        catchError(err => {
            console.warn('⚠️ Error POST API:', err);
            return guardarLocal();
        })
      );
    } else {
      return guardarLocal();
    }
  }

  // 3. Borrar usuario
  borrar(usuario: Usuario, fromSync = false): Observable<void> {
    // Si viene del Sync y falla, lanzamos error para reintentar luego
    if (fromSync) {
      return this.http.delete<void>(`${this.apiUrl}/${usuario.id}`);
    }

    if (!usuario.id) {
      return from(this.localDb.usuarios.delete(usuario.localId!).then(() => {}));
    }

    const borrarLocalmente = () => {
        console.log('🔌 Marcando usuario para borrar offline...');
        return from(
            this.localDb.usuarios.where('id').equals(usuario.id!)
            .modify({ syncStatus: 'delete' } as any)
            .then(() => {})
        );
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${usuario.id}`).pipe(
        tap(() => this.localDb.usuarios.where('id').equals(usuario.id!).delete()),
        catchError(err => {
            console.warn('⚠️ Error DELETE API:', err);
            return borrarLocalmente();
        })
      );
    } else {
      return borrarLocalmente();
    }
  }

  // ACTUALIZAR (Híbrido)
  actualizar(usuario: Usuario, fromSync = false): Observable<any> {
    // 1. Validación de seguridad: Si no tiene ID, no podemos hacer nada.
    if (!usuario.id) {
      console.error('Intentando actualizar usuario sin ID');
      return new Observable(observer => observer.error('ID requerido'));
    }

    // Guardamos el ID en una constante para que TypeScript sepa que NO es undefined
    const idSeguro = usuario.id; 

    if (fromSync) {
      return this.http.put(`${this.apiUrl}/${idSeguro}`, usuario);
    }

    const actualizarLocalmente = () => {
        console.log('🔌 Actualizando usuario offline...');
        return from(
            // Usamos 'idSeguro' que TypeScript sabe que es un número
            this.localDb.usuarios.where('id').equals(idSeguro)
            .modify({
                ...usuario, 
                syncStatus: 'update'
            } as any)
            .then(() => usuario)
        );
    };

    if (this.isOnline) {
      return this.http.put(`${this.apiUrl}/${idSeguro}`, usuario).pipe(
        tap(() => {
           // Actualizar copia local
           this.localDb.usuarios.where('id').equals(idSeguro).modify({ 
             ...usuario, 
             syncStatus: 'synced' 
            } as any);
        }),
        catchError(err => {
            console.warn('⚠️ Error PUT API:', err);
            return actualizarLocalmente();
        })
      );
    } else {
      return actualizarLocalmente();
    }
  }
  
}
