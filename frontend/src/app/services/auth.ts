import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { LocalDbService } from './local-db';
import { Observable, from, of, throwError } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  // Inyección de dependencias moderna (Angular 16+)
  private http = inject(HttpClient);
  private router = inject(Router);
  private localDb = inject(LocalDbService); 
  private platformId = inject(PLATFORM_ID);

  // URL de tu Backend (Asegúrate que coincida con tu Spring Boot)
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'authToken';
  private offlineUserKey = 'offlineUser';

  constructor() { }

  private get isOnline(): boolean { return navigator.onLine; }

  // --- FUNCIÓN AUXILIAR PARA GENERAR HASH SHA-256 ---
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // --- LOGIN HIBRIDO---
  login(credentials: {username: string, password: string}): Observable<any> {

    if (this.isOnline) {
      // Intento Online
      return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
        tap(async response => {
          if (response.token) {
            this.setToken(response.token);

            // 🔒 GUARDAR HASH DE CONTRASEÑA PARA VALIDACIÓN OFFLINE FUTURA
            const passwordHash = await this.hashPassword(credentials.password);
            const user = await this.localDb.getUsuarioByUsername(credentials.username);

            if (user) {
              // Actualizar usuario existente con el hash
              await this.localDb.usuarios.where('username').equals(credentials.username)
                .modify({ passwordHash: passwordHash });
            }

            // Limpiamos sesión offline si existía
            if (isPlatformBrowser(this.platformId)) {
              localStorage.removeItem(this.offlineUserKey);
            }
          }
        }),
        catchError(err => {
          console.warn('⚠️ Fallo Login Online. Intentando Offline...', err);
          return this.loginOffline(credentials);
        })
      );
    } else {
      // Intento directo Offline
      return this.loginOffline(credentials);
    }
  }

  // --- LÓGICA LOGIN OFFLINE ---
  private loginOffline(credentials: {username: string, password: string}): Observable<any> {
    return from(this.hashPassword(credentials.password).then(async inputHash => {
      const user = await this.localDb.getUsuarioByUsername(credentials.username);

      if (!user) {
        throw new Error('Usuario no encontrado localmente (Debes iniciar sesión online al menos una vez)');
      }

      // 🔒 VALIDACIÓN DE CONTRASEÑA CON HASH
      if (!user.passwordHash) {
        throw new Error('Sin credenciales offline. Debes iniciar sesión online al menos una vez para habilitar modo offline.');
      }

      // Comparar el hash de la contraseña ingresada con el hash guardado
      if (inputHash !== user.passwordHash) {
        throw new Error('Contraseña incorrecta');
      }

      // ✅ Contraseña válida - Permitir acceso offline
      console.log('✅ Login offline exitoso para:', user.username);

      const fakeToken = this.createFakeToken(user);
      this.setToken(fakeToken);

      // Guardamos flag de sesión offline
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.offlineUserKey, JSON.stringify(user));
      }

      return { token: fakeToken };
    }));
  }

  // Crear un token falso para que el resto de la app (getRole, etc) funcione
  private createFakeToken(user: any): string {
    // Estructura básica de un JWT (Header.Payload.Signature)
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
      sub: user.username, 
      role: user.role, 
      nombre: user.nombre + " " + user.apellido,
      exp: 9999999999 // Expiración lejana
    }));
    const signature = "offline_signature";
    return `${header}.${payload}.${signature}`;
  }

  // --- REGISTRO (Opcional por ahora) ---
  register(userData: any) {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
        }
      })
    );
  }

  // --- LOGOUT ---
  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.offlineUserKey);
    }
    this.router.navigate(['/login']);
  }

  // --- UTILIDADES ---

  // --- MÉTODOS SEGUROS (SSR SAFE) ---

  private setToken(token: string) {
    // Solo guardamos si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  // Obtener el token (para adjuntarlo a las peticiones)
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null; // En el servidor retornamos null
  }

  // Saber si el usuario está logueado (para proteger rutas)
  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem(this.tokenKey);
    }
    return false; // En el servidor retornamos false
  }

  private getDecodedToken(): any {
    const token = this.getToken();
    if (token) {
      try {
        return jwtDecode(token);
      } catch(e) {
        return null;
      }
    }
    return null;
  }

  getRole(): string {
    const decoded: any = this.getDecodedToken();
    if (!decoded) return '';
    
    // 👇 Imprime esto en consola para depurar
    console.log('Token Decodificado:', decoded);

    // Buscamos la propiedad "role" que pusimos en Java
    return decoded.role || ''; 
  }

  isAdmin(): boolean {
    const role = this.getRole();
    console.log('Rol detectado:', role); // Debug
    return role === 'ADMIN';
  }

  isTeacher(): boolean {
    const role = this.getRole();
    return role === 'TEACHER';
  }

  isStudent(): boolean {
    const role = this.getRole();
    return role === 'STUDENT';
  }

  getUserName(): string {
    const decoded: any = this.getDecodedToken();
    return decoded?.nombre || decoded?.sub || 'Usuario';
  }
}
