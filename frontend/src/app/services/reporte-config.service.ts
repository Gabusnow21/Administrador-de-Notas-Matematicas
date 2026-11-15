import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';
import { environment } from '../environments/environment';

// =============================================================================
// Modelo de configuración de la boleta
// =============================================================================

/** Versión del esquema. Incrementar si cambia la forma del objeto. */
export const REPORTE_CONFIG_VERSION = 1;

/** Clave de la caché local (localStorage). */
export const REPORTE_CONFIG_STORAGE = 'reporteBoletaConfig.v1';

/** Límite de tamaño del JSON de configuración (debe coincidir con el backend). */
export const REPORTE_CONFIG_MAX_BYTES = 2 * 1024 * 1024;

/** Dimensiones máximas permitidas para los logos personalizados (píxeles). */
export const LOGO_MAX_PX = 512;

/** Peso máximo del archivo de logo aceptado (bytes). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type Orientacion = 'portrait' | 'landscape';

/** Línea del bloque de contacto del encabezado (email, dirección, teléfono). */
export interface LineaContacto {
  texto: string;
  negrita: boolean;
}

/** Columna de trimestre en la tabla de asignaturas. */
export interface ColumnaTrimestre {
  /** Encabezado de la tabla de asignaturas (ej. "I TRIMESTRE"). */
  etiqueta: string;
  /** Encabezado corto para la tabla de conducta (ej. "I"). */
  etiquetaCorta: string;
  visible: boolean;
}

/** Columna calculada de la tabla de asignaturas (TOTAL / PROMEDIO). */
export interface ColumnaCalculo {
  etiqueta: string;
  visible: boolean;
}

/** Ítem de conducta. `numero` es el prefijo de la actividad (ej. "1. ..."). */
export interface ItemConducta {
  numero: number;
  texto: string;
}

/** Bloque de conducta (ej. POSITIVOS, A MEJORAR). */
export interface BloqueConducta {
  id: string;
  titulo: string;
  items: ItemConducta[];
}

export interface ReporteConfig {
  version: number;

  encabezado: {
    institucion: string;
    codigo: string;
    titulo: string;
    subtitulo: string;
    lineasContacto: LineaContacto[];
    mostrarLogos: boolean;
    mostrarContacto: boolean;
    mostrarCodigo: boolean;
    /** dataURL (PNG) personalizado o null para usar el logo por defecto. */
    logoIzquierda: string | null;
    logoDerecha: string | null;
  };

  estudiante: {
    mostrarNombre: boolean;
    mostrarCodigo: boolean;
    etiquetaCodigo: string;
  };

  materias: {
    /** Encabezado de la columna de asignaturas. */
    etiquetaMateria: string;
    columnas: {
      trimestres: ColumnaTrimestre[];
      total: ColumnaCalculo;
      promedio: ColumnaCalculo;
    };
    /** Decimales para trimestres y total (0-4). */
    decimales: number;
    /** Decimales del promedio final (0-4). Con 0 se comporta como Math.round. */
    decimalesPromedio: number;
    mostrarMateriasSinNotas: boolean;
  };

  conducta: {
    habilitado: boolean;
    titulo: string;
    subtitulo: string;
    /** Nota mínima para pintar el cheque (0-10). */
    notaMinimaCheck: number;
    bloques: BloqueConducta[];
  };

  pie: {
    habilitado: boolean;
    texto: string;
  };

  estilos: {
    orientacion: Orientacion;
    /** Tamaño de la página. Letter (carta) es el valor por defecto. */
    tamanoPagina: 'letter' | 'a4';
    /** Tamaño base de fuente en puntos (10 = tamaño original). */
    tamanoFuente: number;
    /** Color primario de los datos del estudiante (hex). */
    colorPrimario: string;
    /** Tamaño de los logos en milímetros. */
    tamanoLogo: number;
  };
}

// =============================================================================
// Configuración por defecto (idéntica al reporte histórico)
// =============================================================================

export const CONFIGURACION_REPORTE_POR_DEFECTO: ReporteConfig = {
  version: REPORTE_CONFIG_VERSION,

  encabezado: {
    institucion: '"CENTRO ESCOLAR CATÓLICO "MADRE CLARA QUIRÓS"',
    codigo: '21276',
    titulo: 'REGISTRO ACADÉMICO DE MATERIAS COMPLEMENTARIAS',
    subtitulo: 'I, II, III CICLO',
    lineasContacto: [
      { texto: 'cecmadreclaraquiros@yahoo.com', negrita: false },
      { texto: 'Final barrio la Cruz, La Palma Chalatenango.', negrita: false },
      { texto: 'Tel. 6014-3125, 7187-7141', negrita: true },
    ],
    mostrarLogos: true,
    mostrarContacto: true,
    mostrarCodigo: true,
    logoIzquierda: null,
    logoDerecha: null,
  },

  estudiante: {
    mostrarNombre: true,
    mostrarCodigo: true,
    etiquetaCodigo: 'NIE',
  },

  materias: {
    etiquetaMateria: 'ASIGNATURAS',
    columnas: {
      trimestres: [
        { etiqueta: 'I TRIMESTRE', etiquetaCorta: 'I', visible: true },
        { etiqueta: 'II TRIMESTRE', etiquetaCorta: 'II', visible: true },
        { etiqueta: 'III TRIMESTRE', etiquetaCorta: 'III', visible: true },
      ],
      total: { etiqueta: 'TOTAL', visible: true },
      promedio: { etiqueta: 'PROMEDIO', visible: true },
    },
    decimales: 2,
    decimalesPromedio: 0,
    mostrarMateriasSinNotas: true,
  },

  conducta: {
    habilitado: true,
    titulo: 'ASPECTOS PARA EVALUAR',
    subtitulo: 'Los marcados con un cheque son los vivenciados en la institución',
    notaMinimaCheck: 5,
    bloques: [
      {
        id: 'positivos',
        titulo: 'POSITIVOS',
        items: [
          { numero: 1, texto: 'Coopera y participa en las distintas actividades del aula y Centro Escolar.' },
          { numero: 2, texto: 'Es respetuoso con todos los profesores, compañeros y demás personas.' },
          { numero: 3, texto: 'Presenta sus trabajos completos, en orden, limpios y en la fecha indicada.' },
          { numero: 4, texto: 'Es responsable y organizado en su trabajo.' },
          { numero: 5, texto: 'Tiene hábito de estudio.' },
          { numero: 6, texto: 'Ha mejorado su rendimiento escolar.' },
        ],
      },
      {
        id: 'a-mejorar',
        titulo: 'A MEJORAR',
        items: [
          { numero: 7, texto: 'Tiene ausencia sin justificación escrita.' },
          { numero: 8, texto: 'Se presenta al Centro Escolar con uniforme incompleto.' },
          { numero: 9, texto: 'No trae completos sus textos y útiles escolares.' },
          { numero: 10, texto: 'Usa vocabulario Soez.' },
          { numero: 11, texto: 'Interrumpe el desarrollo de las clases.' },
          { numero: 12, texto: 'Presenta sus tareas escolares incompletas y fuera del tiempo fijado.' },
          { numero: 13, texto: 'Usa tintes, maquillajes, joyas y celulares.' },
          { numero: 14, texto: 'Se presenta el estudiante con corte de cabello inadecuado.' },
          { numero: 15, texto: 'Tiene Deméritos' },
        ],
      },
    ],
  },

  pie: {
    habilitado: true,
    texto:
      '"Padres, no hagan enojar a sus hijos, sino más bien crienlos con disciplina e instrúyalos en el amor del señor. Efesios 6:4"',
  },

  estilos: {
    orientacion: 'portrait',
    tamanoPagina: 'letter',
    tamanoFuente: 10,
    colorPrimario: '#003366',
    tamanoLogo: 25,
  },
};

// =============================================================================
// Utilidades de configuración
// =============================================================================

export function clonarConfig(config: ReporteConfig): ReporteConfig {
  return JSON.parse(JSON.stringify(config)) as ReporteConfig;
}

/**
 * Fusiona una configuración parcial (guardada en el servidor o en caché)
 * sobre los valores por defecto, de forma recursiva. Los arreglos se toman
 * completos del valor parcial y si quedan incompletos se reponen de los
 * valores por defecto en `validarConfig`.
 */
export function fusionarConfig(base: ReporteConfig, parcial: unknown): ReporteConfig {
  if (!parcial || typeof parcial !== 'object' || Array.isArray(parcial)) {
    return clonarConfig(base);
  }
  const salida: Record<string, unknown> = clonarConfig(base) as unknown as Record<string, unknown>;

  for (const [clave, valor] of Object.entries(parcial as Record<string, unknown>)) {
    const actual = salida[clave];
    if (Array.isArray(valor)) {
      salida[clave] = valor;
    } else if (valor && typeof valor === 'object' && actual && typeof actual === 'object' && !Array.isArray(actual)) {
      salida[clave] = fusionarConfig(actual as ReporteConfig, valor);
    } else if (valor !== undefined && valor !== null) {
      salida[clave] = valor;
    }
  }

  return salida as unknown as ReporteConfig;
}

/**
 * Devuelve los problemas detectados en la configuración (lista vacía si es válida).
 */
export function validarConfig(config: ReporteConfig): string[] {
  const errores: string[] = [];

  if (!config.encabezado || !config.encabezado.institucion?.trim()) {
    errores.push('El nombre de la institución es obligatorio.');
  }

  const trim = config.materias?.columnas?.trimestres;
  if (!Array.isArray(trim) || trim.length !== 3) {
    errores.push('La tabla de materias debe tener exactamente 3 trimestres.');
  }

  const columnas = config.materias?.columnas;
  if (columnas) {
    if (!config.materias.etiquetaMateria?.trim()) {
      errores.push('La etiqueta de la columna de asignaturas es obligatoria.');
    }
    const visible =
      columnas.total?.visible ||
      columnas.promedio?.visible ||
      (Array.isArray(columnas.trimestres) && columnas.trimestres.some(t => t.visible));
    if (!visible) {
      errores.push('Debe haber al menos una columna visible en la tabla de materias.');
    }

    if (!Number.isInteger(config.materias.decimales) || config.materias.decimales < 0 || config.materias.decimales > 4) {
      errores.push('Los decimales de trimestres deben estar entre 0 y 4.');
    }
    if (
      !Number.isInteger(config.materias.decimalesPromedio) ||
      config.materias.decimalesPromedio < 0 ||
      config.materias.decimalesPromedio > 4
    ) {
      errores.push('Los decimales del promedio deben estar entre 0 y 4.');
    }
  }

  if (config.conducta?.habilitado) {
    const bloques = config.conducta.bloques ?? [];
    const totalItems = bloques.reduce((acc, b) => acc + (b.items?.length ?? 0), 0);
    if (bloques.length === 0 || totalItems === 0) {
      errores.push('La conducta está activada: debe existir al menos un bloque con un ítem.');
    }

    const numeros = bloques.flatMap(b => b.items ?? []).map(i => i.numero);
    const unicos = new Set(numeros);
    if (unicos.size !== numeros.length) {
      errores.push('Hay números de ítem de conducta duplicados.');
    }
    if (numeros.some(n => !Number.isInteger(n) || n < 1 || n > 99)) {
      errores.push('Los números de ítem de conducta deben estar entre 1 y 99.');
    }

    const nota = config.conducta.notaMinimaCheck;
    if (typeof nota !== 'number' || nota < 0 || nota > 10) {
      errores.push('La nota mínima para el cheque debe estar entre 0 y 10.');
    }
  }

  const estilos = config.estilos;
  if (estilos) {
    if (estilos.orientacion !== 'portrait' && estilos.orientacion !== 'landscape') {
      errores.push('La orientación debe ser vertical u horizontal.');
    }
    if (estilos.tamanoPagina !== 'letter' && estilos.tamanoPagina !== 'a4') {
      errores.push('El tamaño de página debe ser carta o A4.');
    }
    if (estilos.tamanoFuente < 8 || estilos.tamanoFuente > 14) {
      errores.push('El tamaño de fuente debe estar entre 8 y 14.');
    }
    if (estilos.tamanoLogo < 15 || estilos.tamanoLogo > 40) {
      errores.push('El tamaño de los logos debe estar entre 15 y 40 mm.');
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(estilos.colorPrimario || '')) {
      errores.push('El color primario debe ser un color hexadecimal válido.');
    }
  }

  return errores;
}

// =============================================================================
// Servicio
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ReporteConfigService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/configuracion/reporte-boleta`;

  private readonly config = signal<ReporteConfig>(this.leerCache());
  /** Configuración vigente (caché local + servidor). */
  readonly configuracion = this.config.asReadonly();

  /** Una sola petición de carga por sesión. */
  private cargando: Promise<ReporteConfig> | null = null;

  /** Versión síncrona para usar dentro de la generación del PDF. */
  getSnapshot(): ReporteConfig {
    return this.config();
  }

  /**
   * Garantiza que la configuración esté cargada desde el servidor.
   * Si no hay conexión o el endpoint falla, se mantiene la caché local
   * (y en último caso los valores por defecto).
   */
  ensureLoaded(): Promise<ReporteConfig> {
    if (!this.cargando) {
      this.cargando = this.obtenerRemoto()
        .then(config => {
          if (config) {
            this.establecer(config);
          }
          return this.getSnapshot();
        })
        .catch(() => this.getSnapshot());
    }
    return this.cargando;
  }

  /** Fuerza una nueva petición al servidor (descarta la promesa cacheada). */
  recargar(): Promise<ReporteConfig> {
    this.cargando = null;
    return this.ensureLoaded();
  }

  /** Persiste la configuración en el servidor y la aplica en memoria. */
  guardar(config: ReporteConfig): Observable<void> {
    const errores = validarConfig(config);
    if (errores.length > 0) {
      return throwError(() => new Error(errores.join(' ')));
    }

    const tamaño = JSON.stringify(config).length;
    if (tamaño > REPORTE_CONFIG_MAX_BYTES) {
      return throwError(() => new Error('La configuración supera el tamaño máximo permitido (2 MB).'));
    }

    return this.http.put<void>(this.apiUrl, config).pipe(
      tap(() => {
        this.establecer(config);
        this.cargando = Promise.resolve(config);
      })
    );
  }

  /** Restaura los valores por defecto del reporte (aún debe guardarse). */
  restaurarPorDefecto(): ReporteConfig {
    const porDefecto = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    this.establecer(porDefecto);
    return porDefecto;
  }

  // ------------------------------------------------------------------

  private establecer(config: ReporteConfig) {
    this.config.set(config);
    this.escribirCache(config);
  }

  private async obtenerRemoto(): Promise<ReporteConfig | null> {
    try {
      const respuesta = await this.http
        .get<unknown>(this.apiUrl, { responseType: 'json' })
        .toPromise();

      const dato =
        typeof respuesta === 'string'
          ? (JSON.parse(respuesta) as unknown)
          : respuesta;

      if (!dato || typeof dato !== 'object' || Object.keys(dato as object).length === 0) {
        // El servidor no tiene configuración guardada: mantener la local.
        return null;
      }

      return fusionarConfig(CONFIGURACION_REPORTE_POR_DEFECTO, dato);
    } catch {
      return null;
    }
  }

  private leerCache(): ReporteConfig {
    if (!isPlatformBrowser(this.platformId)) {
      return clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    }
    try {
      const crudo = localStorage.getItem(REPORTE_CONFIG_STORAGE);
      if (!crudo) {
        return clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      }
      const dato = JSON.parse(crudo) as unknown;
      return fusionarConfig(CONFIGURACION_REPORTE_POR_DEFECTO, dato);
    } catch {
      return clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    }
  }

  private escribirCache(config: ReporteConfig) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(REPORTE_CONFIG_STORAGE, JSON.stringify(config));
    } catch {
      // Sin espacio en localStorage: la configuración sigue vigente en memoria.
    }
  }
}
