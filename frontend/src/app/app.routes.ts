import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { VistaGrado } from './components/vista-grado/vista-grado';
import { VistaCalificaciones } from './components/vista-calificaciones/vista-calificaciones';
export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'dashboard', component: Dashboard },
    { path: 'grado/:id', component: VistaGrado },
    { path: 'estudiante/:id/calificaciones', component: VistaCalificaciones },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
