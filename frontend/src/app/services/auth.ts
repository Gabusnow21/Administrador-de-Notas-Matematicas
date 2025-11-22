import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  // Inyección de dependencias moderna (Angular 16+)
  private http = inject(HttpClient);
  private router = inject(Router);

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
          localStorage.setItem(this.tokenKey, response.token);
        }
      })
    );
  }

  // --- REGISTRO (Opcional por ahora) ---
  register(userData: any) {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
        }
      })
    );
  }

  // --- LOGOUT ---
  logout() {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }

  // --- UTILIDADES ---

  // Obtener el token (para adjuntarlo a las peticiones)
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Saber si el usuario está logueado (para proteger rutas)
  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }
}
