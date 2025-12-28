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
import { LayoutComponent } from './components/layout/layout';
import { VistaProgresoEstudiante } from './components/vista-progreso-estudiante/vista-progreso-estudiante';
import { AccesoProgresoComponent } from './components/acceso-progreso/acceso-progreso';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'info-recompensas', component: InfoRecompensasComponent },
    { path: 'mi-progreso', component: AccesoProgresoComponent },
    { path: 'mi-progreso/detalle', component: VistaProgresoEstudiante },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: Dashboard },
            { path: 'grado/:id', component: VistaGrado },
            { path: 'estudiante/:id/calificaciones', component: VistaCalificaciones },
            { path: 'registro-notas', component: RegistroNotas },
            { path: 'gestion-materias', component: GestionMaterias },
            { path: 'gestion-actividades', component: GestionActividades },
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
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'login' }
];
