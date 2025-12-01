import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { LocalDbService } from './local-db';
import { Observable, from, of, throwError } from 'rxjs';

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
  private apiUrl = 'http://localhost:8080/api/auth';
  private tokenKey = 'authToken';
  private offlineUserKey = 'offlineUser';

  constructor() { }

  private get isOnline(): boolean { return navigator.onLine; }

  
  // --- LOGIN HIBRIDO---
  login(credentials: {username: string, password: string}): Observable<any> {
    
    if (this.isOnline) {
      // Intento Online
      return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
        tap(response => {
          if (response.token) {
            this.setToken(response.token);
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
    return from(this.localDb.getUsuarioByUsername(credentials.username).then(user => {
      
      if (!user) {
        throw new Error('Usuario no encontrado localmente (Debes iniciar sesión online al menos una vez)');
      }

      // 🚨 ADVERTENCIA DE SEGURIDAD: 
      // En un entorno real, aquí deberíamos comparar hashes de contraseñas (bcryptjs).
      // Como el backend manda la password encriptada, no podemos desencriptarla.
      // ESTRATEGIA SIMPLE FASE 3: 
      // Si el usuario existe en local, permitimos el acceso asumiendo que es la misma persona.
      // O guardamos un hash local simple al hacer login exitoso online.
      
      // Por ahora, validaremos solo que el usuario exista para permitir trabajo offline
      // (Idealmente, guardaríamos un hash local en el login exitoso online)
      
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
}
