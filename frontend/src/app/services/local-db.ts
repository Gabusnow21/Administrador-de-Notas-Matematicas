import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// Definimos las interfaces locales (pueden ser las mismas que ya usas o simplificadas)
export type SyncStatus = 'synced' | 'create' | 'update' | 'delete';

export interface LocalUsuario {
  localId?: number;
  id?: number;          // ID del servidor
  nombre: string;
  apellido: string;
  username: string;
  password?: string;
  passwordHash?: string; // Hash SHA-256 para validación offline
  role: string;
  syncStatus: SyncStatus;
}

export interface LocalGrado {
  id?: number; 
  serverId?: number; 
  nivel: string;
  seccion: string;
  anioEscolar: number;
  syncStatus: SyncStatus; 
  localId?: number; 
}
export interface LocalEstudiante {
  localId?: number;
  id?: number;
  nombre: string;
  apellido: string;
  gradoId: number;       // Referencia al ID del servidor del grado
  syncStatus: SyncStatus;
}

export interface LocalMateria {
  localId?: number;
  id?: number;
  nombre: string;
  descripcion?: string;
  syncStatus: SyncStatus;
}

export interface LocalTrimestre {
  localId?: number;
  id?: number;
  nombre: string;
  anioEscolar: number;
  syncStatus: SyncStatus;
  fechaInicio?: string; // Mapeado de 'fecha_inicio'
  fechaFin?: string;    // Mapeado de 'fecha_fin'
  estaActivo?: boolean; // Mapeado de 'esta_activo'
}

export interface LocalActividad {
  localId?: number;
  id?: number;
  nombre: string;
  descripcion?: string;
  ponderacion: number;
  materiaId: number;
  trimestreId: number;
  syncStatus: SyncStatus;
  fechaActividad?: string; // Mapeado de 'fecha_actividad'
  parentId?: number;       // Nuevo campo
  promedia?: boolean;      // Nuevo campo
}

export interface LocalCalificacion {
  localId?: number;
  id?: number;
  nota: number;
  observacion?: string;
  estudianteId: number;
  actividadId: number;
  syncStatus: SyncStatus;
}

@Injectable({
  providedIn: 'root',
})

export class LocalDbService extends Dexie {

  //Tablas
  usuarios!: Table<LocalUsuario, number>;
  grados!: Table<LocalGrado, number>;
  estudiantes!: Table<LocalEstudiante, number>;
  materias!: Table<LocalMateria, number>;
  trimestres!: Table<LocalTrimestre, number>;
  actividades!: Table<LocalActividad, number>;
  calificaciones!: Table<LocalCalificacion, number>;

  constructor() {
    super('GestorNotasOfflineDB');//Nombre de base en local
  
    this.version(6).stores({
      usuarios: '++localId, id, username, syncStatus',
      grados: '++localId, id, serverId, nivel, seccion, anioEscolar, syncStatus',
      estudiantes: '++localId, id, gradoId, syncStatus',
      materias: '++localId, id, syncStatus',
      trimestres: '++localId, id, anioEscolar, syncStatus',
      actividades: '++localId, id, materiaId, trimestreId, syncStatus, [materiaId+trimestreId]',
      calificaciones: '++localId, id, estudianteId, actividadId, syncStatus, [estudianteId+actividadId]'
    });
    this.on('populate', () => {
      console.log('Base de datos local creada inicializada');
    });
  }
  // Métodos Genericos
  // Limpiar todo (útil al iniciar sesión para bajar datos frescos)
  async clearAll() {
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });
  }
  // ==========================================
  // MÉTODOS DE USUARIOS
  // ==========================================
  
  // Guardar usuarios que vienen del servidor (para login offline)
  async guardarUsuariosServer(users: any[]) {
    return this.transaction('rw', this.usuarios, async () => {
      // 1. Borrar SOLO los que ya estaban sincronizados (los viejos)
      // Mantenemos los 'create', 'update', 'delete' que aún no han subido
      await this.usuarios.where('syncStatus').equals('synced').delete(); 
      
      const locales = users.map(u => ({
        ...u,
        syncStatus: 'synced' as SyncStatus
      }));
      
      // 2. Insertar o actualizar los nuevos del servidor
      // bulkPut sobreescribirá si hay conflicto de ID, lo cual está bien para datos synced
      await this.usuarios.bulkPut(locales);
    });
  }

  // Buscar usuario localmente (para login offline simple)
  async getUsuarioByUsername(username: string) {
    return await this.usuarios.where('username').equals(username).first();
  }

  // ==========================================
  // GRADOS
  // ==========================================
  
  async guardarGradosServer(grados: any[]) {
    // Guarda datos que vienen del servidor (Status = synced)
    return this.transaction('rw', this.grados, async () => {
      await this.grados.clear(); // Estrategia simple: Borrar y rellenar
      const locales = grados.map(g => ({
        ...g,
        syncStatus: 'synced' as SyncStatus
      }));
      await this.grados.bulkAdd(locales);
    });
  }

  async addGradoOffline(grado: any) {
    return await this.grados.add({
      ...grado,
      id: null, // No tiene ID de server aún
      syncStatus: 'create'
    });
  }

  async getGrados() {
    // Retornar todos los que no estén marcados como eliminados
    return await this.grados
      .filter(g => g.syncStatus !== 'delete')
      .toArray();
  }

  // ==========================================
  // ESTUDIANTES
  // ==========================================

  async guardarEstudiantesServer(estudiantes: any[]) {
    return this.transaction('rw', this.estudiantes, async () => {
      // 1. Obtener los IDs reales que vienen del servidor
      const idsServer = estudiantes.map(e => e.id);
      
      // 2. Buscar en local si ya tenemos registros con esos IDs
      const existentes = await this.estudiantes.where('id').anyOf(idsServer).toArray();
      
      // 3. Crear un mapa para acceso rápido (ServerID -> LocalID)
      const mapaIds = new Map(existentes.map(e => [e.id, e.localId]));

      // 4. Preparar datos combinando lo nuevo con el ID local (si existe)
      const aGuardar = estudiantes.map(e => ({
        ...e,
        gradoId: e.grado ? e.grado.id : e.gradoId, // Aplanar relación
        syncStatus: 'synced' as SyncStatus,
        // 👇 EL TRUCO: Si ya existe, le ponemos su localId para sobreescribirlo
        localId: mapaIds.get(e.id) 
      }));

      // 5. Guardar (Put actualiza si hay llave primaria, agrega si no)
      await this.estudiantes.bulkPut(aGuardar);
    });
  }

  async getEstudiantesPorGrado(gradoId: number) {
    return await this.estudiantes
      .where('gradoId').equals(gradoId)
      .filter(e => e.syncStatus !== 'delete')
      .toArray();
  }

  async addEstudianteOffline(estudiante: any) {
    return await this.estudiantes.add({
      ...estudiante,
      id: null,
      syncStatus: 'create'
    });
  }

  // ==========================================
  // MATERIAS Y TRIMESTRES (Catálogos)
  // ==========================================

  async guardarCatalogos(materias: any[], trimestres: any[]) {
    await this.transaction('rw', [this.materias, this.trimestres], async () => {
      await this.materias.clear();
      await this.materias.bulkAdd(materias.map(m => ({ ...m, syncStatus: 'synced' as SyncStatus })));
      
      await this.trimestres.clear();
      await this.trimestres.bulkAdd(trimestres.map(t => ({ ...t, syncStatus: 'synced' as SyncStatus })));
    });
  }

  async getMaterias() { return await this.materias.toArray(); }
  async getTrimestres() { return await this.trimestres.toArray(); }

  // ==========================================
  // ACTIVIDADES
  // ==========================================

  async guardarActividadesServer(actividades: any[]) {
  return this.transaction('rw', this.actividades, async () => {
      // 1. Obtener los IDs reales que vienen del servidor
      const idsServer = actividades.map(a => a.id);
      
      // 2. Buscar en local si ya tenemos registros con esos IDs
      const existentes = await this.actividades.where('id').anyOf(idsServer).toArray();
      
      // 3. Crear un mapa para acceso rápido (ServerID -> LocalID)
      const mapaIds = new Map(existentes.map(a => [a.id, a.localId]));

      // 4. Preparar datos combinando lo nuevo con el ID local (si existe)
      const locales = actividades.map(a => {
        // Lógica robusta para extraer el ID, venga como objeto o plano
        const mId = a.materia ? a.materia.id : a.materiaId;
        const tId = a.trimestre ? a.trimestre.id : a.trimestreId;

        return {
          ...a,
          // 👇 LA SOLUCIÓN: Number() obligatorio
          materiaId: Number(mId),
          trimestreId: Number(tId),
          
          // Preservar localId si existe
          localId: mapaIds.get(a.id), 
          syncStatus: 'synced' as SyncStatus
        };
      });

      // 5. Guardar (Put actualiza si hay llave primaria, agrega si no)
      await this.actividades.bulkPut(locales);
    });
  }

  async getActividades(materiaId: number, trimestreId: number) {
    return await this.actividades
      .where({ materiaId: materiaId, trimestreId: trimestreId })
      .filter(a => a.syncStatus !== 'delete')
      .toArray();
  }

  // ==========================================
  // CALIFICACIONES
  // ==========================================

  async guardarCalificacionesServerSafe(calificacionesServer: any[]) {
    if (!calificacionesServer || calificacionesServer.length === 0) return;

    return this.transaction('rw', this.calificaciones, async () => {
      
      const notasLocales = await this.calificaciones.toArray();
      
      // Mapa clave compuesta para búsqueda rápida
      // Usamos String() para asegurar que coincida aunque uno sea número y otro texto
      const mapPorClave = new Map();
      notasLocales.forEach(n => {
        const clave = `${n.estudianteId}-${n.actividadId}`;
        mapPorClave.set(clave, n);
      });

      const aGuardar: any[] = [];

      for (const calServer of calificacionesServer) {
        const clave = `${calServer.estudianteId}-${calServer.actividadId}`;
        const local = mapPorClave.get(clave);

        // 🛡️ PROTECCIÓN:
        // Si existe localmente y tiene cambios pendientes, lo respetamos.
        // Usamos optional chaining (?.) para evitar el error 'cannot read properties of undefined'
        if (local?.syncStatus === 'create' || local?.syncStatus === 'update') {
          console.log(`🛡️ Protegiendo nota local pendiente. Estudiante: ${calServer.estudianteId}`);
          continue; 
        }

        // Preparamos para guardar
        const nuevaNota = {
            ...calServer,
            // Convertimos IDs a número por si acaso vienen como string
            estudianteId: Number(calServer.estudianteId),
            actividadId: Number(calServer.actividadId),
            localId: local?.localId, // Si existía, usamos su ID para actualizar
            syncStatus: 'synced'
        };
        aGuardar.push(nuevaNota);
      }

      if (aGuardar.length > 0) {
        await this.calificaciones.bulkPut(aGuardar);
      }
    });
  }

  async getCalificacionesPorEstudiante(estudianteId: number) {
    return await this.calificaciones
      .where('estudianteId').equals(estudianteId)
      .toArray();
  } 

  async getCalificacionesPorActividad(actividadId: number) {
    return await this.calificaciones
      .where('actividadId').equals(actividadId)
      .toArray();
  }

  async guardarNotaOffline(nota: any) {
    // Lógica Upsert Local
    const notasExistentes = await this.calificaciones
      .where('actividadId').equals(Number(nota.actividadId))
      .toArray();

    const existente = notasExistentes.find(n => 
        Number(n.estudianteId) === Number(nota.estudianteId)
    );

    if (existente) {
      // ACTUALIZAR (Update)
      console.log('🔄 Actualizando nota local existente:', existente.localId);
      return await this.calificaciones.update(existente.localId!, {
        ...nota,
        estudianteId: Number(nota.estudianteId),
        actividadId: Number(nota.actividadId),
        // Si la nota que llega tiene un estado, lo respetamos.
        // Si no, aplicamos la lógica de 'update' (a menos que fuera 'create').
        syncStatus: nota.syncStatus || (existente.syncStatus === 'create' ? 'create' : 'update')
      });
    } else {
      // CREAR (Insert)
      console.log('➕ Creando nueva nota local');
      return await this.calificaciones.add({
        ...nota,
        estudianteId: Number(nota.estudianteId),
        actividadId: Number(nota.actividadId),
        // Si la nota que llega no tiene 'id' o 'syncStatus', asignamos los de por defecto para una nueva.
        id: nota.id || null,
        syncStatus: nota.syncStatus || 'create'
      });
    }
  }

  // ==========================================
  // PENDIENTES DE SINCRONIZACIÓN
  // ==========================================
  
  // Este método lo usará el servicio de sincronización para saber qué subir
  async getPendientes(tabla: Table) {
    return await tabla
      .filter(item => item.syncStatus !== 'synced')
      .toArray();
  }
  
}
