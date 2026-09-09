import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { teacherGuard } from './guards/teacher-guard';
import { authGuard } from './guards/auth.guard';
import { LayoutComponent } from './components/layout/layout';

export const routes: Routes = [
    { 
        path: 'login', 
        loadComponent: () => import('./components/login/login').then(m => m.Login)
    },
    { 
        path: 'info-recompensas', 
        loadComponent: () => import('./components/info-recompensas/info-recompensas').then(m => m.InfoRecompensasComponent)
    },
    { 
        path: 'mi-progreso', 
        loadComponent: () => import('./components/acceso-progreso/acceso-progreso').then(m => m.AccesoProgresoComponent)
    },
    { 
        path: 'mi-progreso/detalle', 
        loadComponent: () => import('./components/vista-progreso-estudiante/vista-progreso-estudiante').then(m => m.VistaProgresoEstudiante)
    },
    { 
        path: 'descargar-boleta', 
        loadComponent: () => import('./components/descargar-boleta/descargar-boleta').then(m => m.DescargarBoleta)
    },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { 
                path: 'dashboard', 
                loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
            },
            { 
                path: 'grado/:id', 
                loadComponent: () => import('./components/vista-grado/vista-grado').then(m => m.VistaGrado)
            },
            { 
                path: 'estudiante/:id/calificaciones', 
                loadComponent: () => import('./components/vista-calificaciones/vista-calificaciones').then(m => m.VistaCalificaciones)
            },
            { 
                path: 'registro-notas', 
                loadComponent: () => import('./components/registro-notas/registro-notas').then(m => m.RegistroNotas)
            },
            { 
                path: 'gestion-materias', 
                loadComponent: () => import('./components/gestion-materias/gestion-materias').then(m => m.GestionMaterias)
            },
            { 
                path: 'gestion-actividades', 
                loadComponent: () => import('./components/gestion-actividades/gestion-actividades').then(m => m.GestionActividades)
            },
            { 
                path: 'gestion-asistencia', 
                loadComponent: () => import('./components/gestion-asistencia/gestion-asistencia').then(m => m.GestionAsistenciaComponent),
                canActivate: [teacherGuard] 
            },
            {
                path: 'configuracion/usuarios',
                loadComponent: () => import('./components/gestion-usuarios/gestion-usuarios').then(m => m.GestionUsuarios),
                canActivate: [adminGuard]
            },
            {
                path: 'configuracion/trimestres',
                loadComponent: () => import('./components/gestion-trimestres/gestion-trimestres').then(m => m.GestionTrimestres),
                canActivate: [adminGuard]
            },
            {
                path: 'configuracion/materias',
                loadComponent: () => import('./components/gestion-materias/gestion-materias').then(m => m.GestionMaterias),
                canActivate: [teacherGuard]
            },
            {
                path: 'configuracion/actividades',
                loadComponent: () => import('./components/gestion-actividades/gestion-actividades').then(m => m.GestionActividades),
                canActivate: [teacherGuard]
            },
            {
                path: 'gestion-recompensas',
                loadComponent: () => import('./components/gestion-recompensas/gestion-recompensas').then(m => m.GestionRecompensasComponent),
                canActivate: [teacherGuard]
            },
            {
                path: 'nfc-terminal',
                loadComponent: () => import('./components/nfc-terminal/nfc-terminal').then(m => m.NfcTerminalComponent),
                canActivate: [teacherGuard]
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'login' }
];
