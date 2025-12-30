import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from} from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { LocalDbService } from './local-db';
import { environment } from '../environments/environment.prod';

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
  private apiUrl = `${environment.apiUrl}/usuarios`;
  private registerUrl = `${environment.apiUrl}/auth/register`; // URL de registro
  private localDb = inject(LocalDbService);

  private get isOnline(): boolean { return navigator.onLine; }

// 1. LISTAR
  getAll(): Observable<Usuario[]> {
    if (this.isOnline) {
      return this.http.get<Usuario[]>(this.apiUrl).pipe(
        switchMap(async (data) => {
          await this.localDb.guardarUsuariosServer(data);
          return await this.localDb.usuarios.filter(u => u.syncStatus !== 'delete').toArray();
        }),
        catchError(err => {
          console.warn('⚠️ Fallo API Usuarios. Usando local.', err);
          return from(this.localDb.usuarios.filter(u => u.syncStatus !== 'delete').toArray() as Promise<Usuario[]>);
        })
      );
    } else {
      return from(this.localDb.usuarios.filter(u => u.syncStatus !== 'delete').toArray() as Promise<Usuario[]>);
    }
  }

  // 👇 2. CREAR (¡Revisa esta parte!)
  crear(usuario: Usuario, fromSync = false): Observable<Usuario> {
    
    // 🛑 SI VIENE DE SYNC, RETORNA EL HTTP PURO (Sin catchError)
    if (fromSync) {
      return this.http.post<Usuario>(this.registerUrl, usuario);
    }

    const guardarLocal = () => {
      console.log('🔌 Guardando usuario offline...');
      const userLocal: any = { ...usuario, id: null, syncStatus: 'create' };
      return from(this.localDb.usuarios.add(userLocal).then(() => userLocal));
    };

    if (this.isOnline) {
      return this.http.post<Usuario>(this.registerUrl, usuario).pipe(
        tap(u => {
           this.localDb.usuarios.put({ ...u, syncStatus: 'synced' as const });
        }),
        catchError(err => {
            console.warn('⚠️ Error POST API:', err);
            return guardarLocal();
        })
      );
    } else {
      return guardarLocal();
    }
  }

  // 3. ACTUALIZAR
  actualizar(usuario: Usuario, fromSync = false): Observable<any> {
    // 🛑 SI VIENE DE SYNC, RETORNA EL HTTP PURO
    if (fromSync) {
        // Aseguramos que se use el ID del servidor
        return this.http.put(`${this.apiUrl}/${usuario.id}`, usuario);
    }
    
    // ... (resto de lógica update offline igual que antes) ...
    const actualizarLocal = () => {
        console.log('🔌 Actualizando usuario offline...');
        return from(
            this.localDb.usuarios.where('id').equals(usuario.id!)
            .modify({ ...usuario, syncStatus: 'update' as const })
            .then(() => usuario)
        );
    };

    if (this.isOnline) {
        return this.http.put(`${this.apiUrl}/${usuario.id}`, usuario).pipe(
            tap(() => {
                this.localDb.usuarios.where('id').equals(usuario.id!)
                .modify({ ...usuario, syncStatus: 'synced' as const });
            }),
            catchError(() => actualizarLocal())
        );
    } else {
        return actualizarLocal();
    }
  }

  // 4. BORRAR
  borrar(usuario: Usuario, fromSync = false): Observable<void> {
    // 🛑 SI VIENE DE SYNC, RETORNA EL HTTP PURO
    if (fromSync) {
      return this.http.delete<void>(`${this.apiUrl}/${usuario.id}`);
    }

    if (!usuario.id) {
      return from(this.localDb.usuarios.delete(usuario.localId!).then(() => {}));
    }

    const borrarLocalmente = () => {
        console.log('🔌 Borrando offline...');
        return from(
            this.localDb.usuarios.where('id').equals(usuario.id!)
            .modify({ syncStatus: 'delete' as const }).then(() => {})
        );
    };

    if (this.isOnline) {
      return this.http.delete<void>(`${this.apiUrl}/${usuario.id}`).pipe(
        tap(() => this.localDb.usuarios.where('id').equals(usuario.id!).delete()),
        catchError(() => borrarLocalmente())
      );
    } else {
      return borrarLocalmente();
    }
  }
  
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER'
}