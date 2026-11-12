import { Injectable, inject, signal } from '@angular/core';
import { LocalDbService, SyncStatus } from './local-db';
import { GradoService } from './grado';
import { EstudianteService } from './estudiante';
import { MateriaService } from './materia';
import { TrimestreService } from './trimestre';
import { ActividadService } from './actividad';
import { UsuarioService } from './usuario';
import { CalificacionService } from './calificacion';
import { firstValueFrom } from 'rxjs';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
    private localDb = inject(LocalDbService);
  
  // Servicios API
  private gradoService = inject(GradoService);
  private estudianteService = inject(EstudianteService);
  private materiaService = inject(MateriaService);
  private trimestreService = inject(TrimestreService);
  private actividadService = inject(ActividadService);
  private calificacionService = inject(CalificacionService);
  private usuarioService = inject(UsuarioService);

  // Estado de la conexión (Signal para usar en la UI fácilmente)
  isOnline = signal<boolean>(navigator.onLine);
  isSyncing = signal<boolean>(false);
  //Validacion para backend en desarrollo o caido
  isBackendReachable = signal<boolean>(true);

  constructor() {
    this.initNetworkListeners();

    if (this.isOnline()) {
      console.log('🚀 Aplicación iniciada Online. Buscando pendientes...');
      // Damos un pequeño respiro (3s) para que Angular estabilice componentes
      setTimeout(() => {
        this.sincronizar();
      }, 3000);
    }

    this.verificarBackend();
    // Chequear cada 30 segundos si el backend sigue vivo
    setInterval(() => this.verificarBackend(), 30000);

    
  }

  // Método Ping
  verificarBackend() {
    // Usamos cualquier endpoint ligero, ej. GET grados
    // Si usas Actuator en Spring Boot, mejor usar /actuator/health
    this.gradoService.getGrados().subscribe({
      next: () => {
        if (!this.isBackendReachable()) {
            console.log('🟢 Backend detectado nuevamente.');
            this.isBackendReachable.set(true);
            this.sincronizar(); // Auto-sync al volver
        }
      },
      error: () => {
        if (this.isBackendReachable()) {
            console.warn('🔴 Backend inalcanzable.');
            this.isBackendReachable.set(false);
        }
      }
    });
  }

  get isFullyOnline() {
    return this.isOnline() && this.isBackendReachable();
  }

  // Listeners para cambios en el estado de la red
  private initNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada. Iniciando sincronización...');
      this.isOnline.set(true);
      this.sincronizar();
    });

    window.addEventListener('offline', () => {
      console.log('🔌 Conexión perdida. Modo Offline activado.');
      this.isOnline.set(false);
    });
  }

  // ==========================================
  // ORQUESTADOR PRINCIPAL
  // ==========================================

  async sincronizar() {
    if (!this.isOnline() || this.isSyncing()) return;

    this.isSyncing.set(true);

    try {
      // 1. SUBIDA (PUSH): Esperar a que termine OBLIGATORIAMENTE
      await this.pushCambios(); 

      // 2. BAJADA (PULL): Solo bajar después de intentar subir
      await this.pullDatos();

      console.log('✅ Sincronización completada con éxito.');
    } catch (error) {
      console.error('❌ Error durante la sincronización:', error);
    } finally {
      this.isSyncing.set(false);
    }
  }

  // ==========================================
  // 1. LÓGICA DE SUBIDA (PUSH)
  // ==========================================

  private async pushCambios() {
    console.log('⬆️ Iniciando subida de cambios pendientes...');
    
    // El orden importa por las claves foráneas (Primero Grados, luego Estudiantes, etc.)
    await this.syncUsuarios(); // Usuarios es independiente, puede ir primero o último
    await this.syncGrados();
    await this.syncEstudiantes();
    await this.syncCalificaciones();
  }

  // 1.a Sincronizar Usuarios
  private async syncUsuarios() {
const pendientes = await this.localDb.getPendientes(this.localDb.usuarios);
    console.log(`👥 Usuarios pendientes de sync: ${pendientes.length}`);
    
    for (const p of pendientes) {
      try {
        console.log(`Procesando usuario: ${p.username} (Status: ${p.syncStatus})`);

        if (p.syncStatus === 'create') {
          // Llamada al servicio con fromSync = true
          // Usamos firstValueFrom para esperar la respuesta del Observable
          const guardado = await firstValueFrom(this.usuarioService.crear(p, true));
          
          console.log('✅ Usuario creado en server:', guardado);

          if (guardado && guardado.id) {
            // Actualizar local con ID real y marcar synced
            await this.localDb.usuarios.update(p.localId!, { 
              id: guardado.id, 
              syncStatus: 'synced' 
            });
            console.log('🔄 LocalDB actualizado a SYNCED');
          } else {
            console.warn('⚠️ El servidor no devolvió ID para el usuario:', p.username);
          }
        } 
        else if (p.syncStatus === 'delete') {
          if (p.id) {
             await firstValueFrom(this.usuarioService.borrar(p, true));
             console.log('🗑️ Usuario borrado del server');
          }
          await this.localDb.usuarios.delete(p.localId!);
          console.log('🗑️ Usuario borrado de local');
        }
      } catch (err) {
        if ((err as any)?.status >= 400 && (err as any)?.status < 500) {
          await this.localDb.usuarios.update(p.localId!, { syncStatus: 'synced' });
        }
        console.error('❌ Error sync usuario (Reintentará luego):', p.username, err);
      }
    }

  }

  // 1.b Sincronizar Grados
  private async syncGrados() {
    const pendientes = await this.localDb.getPendientes(this.localDb.grados);
    
    for (const p of pendientes) {
      try {
        if (p.syncStatus === 'create') {
          // Enviamos al server (sin ID)
          const guardado = await firstValueFrom(this.gradoService.crearGrado(p));
          // Actualizamos local con el ID real y marcamos synced
          await this.localDb.grados.update(p.localId!, { id: guardado.id, syncStatus: 'synced' });
        } 
        else if (p.syncStatus === 'update') {
          await firstValueFrom(this.gradoService.actualizarGrado(p));
          await this.localDb.grados.update(p.localId!, { syncStatus: 'synced' });
        }
        else if (p.syncStatus === 'delete') {
          if (p.id) await firstValueFrom(this.gradoService.deleteGrado(p.id));
          await this.localDb.grados.delete(p.localId!);
        }
      } catch (err) {
        console.error('Error sincronizando grado:', p, err);
      }
    }
  }

  // 1.c Sincronizar Estudiantes
  private async syncEstudiantes() {
    const pendientes = await this.localDb.getPendientes(this.localDb.estudiantes);
    for (const p of pendientes) {
      try {
        const payload = {
            nombres: p.nombre,
            apellidos: p.apellido,
            email: p.email,
            gradoId: p.gradoId,
            codigoProgreso: p.codigoProgreso
        };

        if (p.syncStatus === 'create') {
          const guardado = await firstValueFrom(this.estudianteService.createEstudiante(payload));
          await this.localDb.estudiantes.update(p.localId!, { id: guardado.id, syncStatus: 'synced' });
        } 
        else if (p.syncStatus === 'update') {
          await firstValueFrom(this.estudianteService.updateEstudiante(p));
          await this.localDb.estudiantes.update(p.localId!, { syncStatus: 'synced' });
        }
        else if (p.syncStatus === 'delete') {
          if (p.id) await firstValueFrom(this.estudianteService.deleteEstudiante(p));
          await this.localDb.estudiantes.delete(p.localId!);
        }
      } catch (err) {
        if ((err as any)?.status >= 400 && (err as any)?.status < 500) {
          await this.localDb.estudiantes.update(p.localId!, { syncStatus: 'synced' });
        }
        console.error('Error sincronizando estudiante:', p, err);
      }
    }
  }

  // 1.d Sincronizar Calificaciones
  private async syncCalificaciones() {
    const pendientes = await this.localDb.getPendientes(this.localDb.calificaciones);
    for (const p of pendientes) {
      try {
        const payload = {
          estudianteId: p.estudianteId,
          actividadId: p.actividadId,
          nota: p.nota,
          observacion: p.observacion || ''
        };

        if (p.syncStatus === 'create') {
          const guardado = await firstValueFrom(this.calificacionService.guardarCalificacion(payload, true));
          
          if (guardado && guardado.id) {
            await this.localDb.calificaciones.update(p.localId!, { 
              id: guardado.id, 
              syncStatus: 'synced' 
            });
          } else {
             // Si no viene ID, al menos lo marcamos como synced para no reintentar,
             // pero alertamos que algo anda mal.
            console.warn("La calificación se guardó en el server pero no devolvió ID. Puede duplicarse.", guardado);
            await this.localDb.calificaciones.update(p.localId!, { syncStatus: 'synced' });
          }
        }
        else if (p.syncStatus === 'update') {
          // El backend debe soportar un PUT/POST en la misma URL para actualizar
          await firstValueFrom(this.calificacionService.guardarCalificacion(payload, true));
          await this.localDb.calificaciones.update(p.localId!, { syncStatus: 'synced' });
        }
        
      } catch (err) {
        console.error('Error sincronizando calificación:', p, err);
      }
    }
  }

  // ==========================================
  // 2. LÓGICA DE BAJADA (PULL)
  // ==========================================

  private async pullDatos() {
console.log('⬇️ INICIANDO SINCRONIZACIÓN COMPLETA (FULL SYNC)...');
    
    try {
      // 1. Catálogos Básicos
      const [usuarios, grados, materias, trimestres] = await Promise.all([
        firstValueFrom(this.usuarioService.getAll()),
        firstValueFrom(this.gradoService.getGrados()),
        firstValueFrom(this.materiaService.getAll()),
        firstValueFrom(this.trimestreService.getAll())
      ]);

      await this.localDb.guardarUsuariosServer(usuarios);
      await this.localDb.guardarGradosServer(grados);
      await this.localDb.guardarCatalogos(materias, trimestres);

      // 2. Estudiantes (Iterando grados activos)
      const promesasEstudiantes = grados.map(g => 
        firstValueFrom(this.estudianteService.getEstudiantesPorGrado(g.id!))
      );
      await Promise.all(promesasEstudiantes);

      // 3. DATOS MASIVOS (Actividades y Calificaciones)
      // Ahora descargamos TODO de una vez
      await firstValueFrom(this.actividadService.sincronizarTodo());
      await firstValueFrom(this.calificacionService.sincronizarTodo());

      console.log('✅ FULL SYNC TERMINADO: Aplicación lista para Offline total.');
      
    } catch (error) {
      console.error('⚠️ Error en Pull de datos:', error);
    } 
  }


  
}
