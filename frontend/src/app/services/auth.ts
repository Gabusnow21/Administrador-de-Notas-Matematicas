import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  // Inyección de dependencias moderna (Angular 16+)
  private http = inject(HttpClient);
  private router = inject(Router);

  private platformId = inject(PLATFORM_ID);

  // URL de tu Backend (Asegúrate que coincida con tu Spring Boot)
  private apiUrl = 'http://localhost:8080/api/auth';
  private tokenKey = 'authToken';

  constructor() { }

  // --- LOGIN ---
  login(credentials: {username: string, password: string}) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // Si el backend responde con un token, lo guardamos
        if (response.token) {
          this.setToken(response.token);
        }
      })
    );
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
}
