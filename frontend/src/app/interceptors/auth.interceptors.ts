import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // 👇 DEBUG: Mira la consola del navegador
  console.log('Interceptando petición a:', req.url);
  console.log('Token encontrado:', token ? 'SÍ' : 'NO');

  if (token) {
    // Si hay token, clonamos la petición y le agregamos el header
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  // Si no hay token, dejamos pasar la petición tal cual
  return next(req);
};