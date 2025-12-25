import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const teacherGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. ¿Está logueado?
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // 2. ¿Es Profe o Admin?
  if (authService.isTeacher() || authService.isAdmin()) {
    return true; // Pasa
  } else {
    alert('Acceso denegado: Se requieren permisos de Profesor o Administrador.');
    router.navigate(['/dashboard']);
    return false;
  }
};
