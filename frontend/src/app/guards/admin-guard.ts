import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. ¿Está logueado?
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // 2. ¿Es Admin?
  if (authService.isAdmin()) {
    return true; // Pasa
  } else {
    // Si es profe y quiere entrar a zona admin, lo mandamos al dashboard
    alert('Acceso denegado: Se requieren permisos de Administrador.');
    router.navigate(['/dashboard']);
    return false;
  }

};
