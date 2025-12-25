import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { InfoRecompensasComponent } from './components/info-recompensas/info-recompensas';
import { VistaGrado } from './components/vista-grado/vista-grado';
import { VistaCalificaciones } from './components/vista-calificaciones/vista-calificaciones';
import { RegistroNotas } from './components/registro-notas/registro-notas';
import { GestionMaterias } from './components/gestion-materias/gestion-materias';
import { GestionActividades } from './components/gestion-actividades/gestion-actividades';
import { adminGuard } from './guards/admin-guard';
import { teacherGuard } from './guards/teacher-guard';
import { GestionUsuarios } from './components/gestion-usuarios/gestion-usuarios';
import { GestionRecompensasComponent } from './components/gestion-recompensas/gestion-recompensas';
import { NfcTerminalComponent } from './components/nfc-terminal/nfc-terminal';
import { GestionTrimestres } from './components/gestion-trimestres/gestion-trimestres';


export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'dashboard', component: Dashboard },
    { path: 'info-recompensas', component: InfoRecompensasComponent },
    { path: 'grado/:id', component: VistaGrado },
    { path: 'estudiante/:id/calificaciones', component: VistaCalificaciones },
    { path: 'registro-notas', component: RegistroNotas },
    { path: 'gestion-materias', component: GestionMaterias },
    { path: 'gestion-actividades', component: GestionActividades },
    //  RUTAS PROTEGIDAS PARA ADMIN
  {
    path: 'configuracion/usuarios',
    component: GestionUsuarios,
    canActivate: [adminGuard]
  },
  {
    path: 'configuracion/trimestres',
    component: GestionTrimestres,
    canActivate: [adminGuard]
  },
  {
    path: 'configuracion/materias',
    component: GestionMaterias,
    canActivate: [teacherGuard]
  },
  {
    path: 'configuracion/actividades',
    component: GestionActividades,
    canActivate: [teacherGuard]
  },
  {
    path: 'gestion-recompensas',
    component: GestionRecompensasComponent,
    canActivate: [teacherGuard]
  },
  {
    path: 'nfc-terminal',
    component: NfcTerminalComponent,
    canActivate: [teacherGuard]
  },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];

