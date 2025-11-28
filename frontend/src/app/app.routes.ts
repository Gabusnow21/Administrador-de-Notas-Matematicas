import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { VistaGrado } from './components/vista-grado/vista-grado';
import { VistaCalificaciones } from './components/vista-calificaciones/vista-calificaciones';
import { RegistroNotas } from './components/registro-notas/registro-notas';
import { GestionMaterias } from './components/gestion-materias/gestion-materias';
import { GestionActividades } from './components/gestion-actividades/gestion-actividades';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'dashboard', component: Dashboard },
    { path: 'grado/:id', component: VistaGrado },
    { path: 'estudiante/:id/calificaciones', component: VistaCalificaciones },
    { path: 'registro-notas', component: RegistroNotas },
    { path: 'gestion-materias', component: GestionMaterias },
    { path: 'gestion-actividades', component: GestionActividades },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
