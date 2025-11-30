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

  // Estado de la conexión (Signal para usar en la UI fácilmente)
  isOnline = signal<boolean>(navigator.onLine);
  isSyncing = signal<boolean>(false);

  constructor() {
    this.initNetworkListeners();
  }

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
      // 1. SUBIDA (PUSH): Enviar cambios locales al servidor
      await this.pushCambios();

      // 2. BAJADA (PULL): Traer datos frescos del servidor
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
    await this.syncGrados();
    await this.syncEstudiantes();
    await this.syncActividades(); // Materias y Trimestres suelen ser estáticos, pero podrías agregarlos
    await this.syncCalificaciones();
  }

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

  private async syncEstudiantes() {
    const pendientes = await this.localDb.getPendientes(this.localDb.estudiantes);
    for (const p of pendientes) {
      try {
        // Mapeo inverso: asegurarnos que mandamos el objeto como el backend lo espera
        // Si el backend espera { grado: { id: X } }, lo construimos aquí
        const payload = { ...p, grado: { id: p.gradoId } };

        if (p.syncStatus === 'create') {
          const guardado = await firstValueFrom(this.estudianteService.createEstudiante(payload));
          await this.localDb.estudiantes.update(p.localId!, { id: guardado.id, syncStatus: 'synced' });
        } 
        else if (p.syncStatus === 'update') {
          await firstValueFrom(this.estudianteService.updateEstudiante(p.id!, payload));
          await this.localDb.estudiantes.update(p.localId!, { syncStatus: 'synced' });
        }
        else if (p.syncStatus === 'delete') {
          if (p.id) await firstValueFrom(this.estudianteService.deleteEstudiante(p.id));
          await this.localDb.estudiantes.delete(p.localId!);
        }
      } catch (err) {
        console.error('Error sincronizando estudiante:', p, err);
      }
    }
  }

  private async syncActividades() {
    const pendientes = await this.localDb.getPendientes(this.localDb.actividades);
    for (const p of pendientes) {
      try {
        // Construir payload plano o anidado según tu backend (Usamos plano por el cambio de la Fase 2)
        const payload = { 
          ...p, 
          materiaId: p.materiaId, 
          trimestreId: p.trimestreId 
        };

        if (p.syncStatus === 'create') {
          const guardado = await firstValueFrom(this.actividadService.crear(payload));
          await this.localDb.actividades.update(p.localId!, { id: guardado.id, syncStatus: 'synced' });
        } 
        else if (p.syncStatus === 'update') {
          await firstValueFrom(this.actividadService.actualizar({ ...payload, id: p.id }));
          await this.localDb.actividades.update(p.localId!, { syncStatus: 'synced' });
        }
        else if (p.syncStatus === 'delete') {
          if (p.id) await firstValueFrom(this.actividadService.borrar(p.id));
          await this.localDb.actividades.delete(p.localId!);
        }
      } catch (err) {
        console.error('Error sincronizando actividad:', p, err);
      }
    }
  }

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

        // Calificaciones siempre es un "Upsert" en tu backend, así que usamos el mismo método
        if (p.syncStatus === 'create' || p.syncStatus === 'update') {
          await firstValueFrom(this.calificacionService.guardarCalificacion(payload));
          await this.localDb.calificaciones.update(p.localId!, { syncStatus: 'synced' });
        }
        // Delete de calificaciones no implementamos en Fase 2, pero iría aquí
      } catch (err) {
        console.error('Error sincronizando calificación:', p, err);
      }
    }
  }

  // ==========================================
  // 2. LÓGICA DE BAJADA (PULL)
  // ==========================================

  private async pullDatos() {
    console.log('⬇️ Bajando datos frescos del servidor...');
    
    // Usamos Promise.all para bajar todo en paralelo y ahorrar tiempo
    const [grados, materias, trimestres] = await Promise.all([
      firstValueFrom(this.gradoService.getGrados()),
      firstValueFrom(this.materiaService.getAll()),
      firstValueFrom(this.trimestreService.getAll())
    ]);

    await this.localDb.guardarGradosServer(grados);
    await this.localDb.guardarCatalogos(materias, trimestres);

    // Para estudiantes y actividades, la estrategia ideal es bajar SOLO lo necesario
    // Pero para simplificar (Full Sync), bajaremos los estudiantes de los grados activos.
    for (const grado of grados) {
      const estudiantes = await firstValueFrom(this.estudianteService.getEstudiantesPorGrado(grado.id));
      await this.localDb.guardarEstudiantesServer(estudiantes);
    }

    // Nota: Actividades y Calificaciones pueden ser muchos datos. 
    // Estrategia: Bajarlas bajo demanda (cuando entres a la pantalla) o bajar todo aquí si no son miles.
    // Por ahora, dejamos la bajada "básica" lista.
  }
  
}
