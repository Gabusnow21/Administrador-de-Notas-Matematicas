import { BoletaData } from './ticket.service';
import { ReporteConfig } from './reporte-config.service';

// =============================================================================
// Lógica pura del boletín: sin jsPDF ni dependencias de Angular.
// Separa los cálculos del renderizado para poder probarlos de forma aislada.
// =============================================================================

export type ClaveColumna = 'materia' | 't1' | 't2' | 't3' | 'total' | 'promedio';

export interface ColumnaReporte {
  clave: ClaveColumna;
  etiqueta: string;
}

export interface MateriaResultado {
  id: number;
  nombre: string;
  /** Promedio ponderado por trimestre (I, II, III). */
  trimestres: [number, number, number];
  /** Suma de los tres promedios trimestrales. */
  total: number;
  /** Promedio final (total / 3). */
  promedio: number;
  sinNotas: boolean;
}

/**
 * Estado de cada ítem de conducta por trimestre.
 * Clave: número del ítem. Valor: [I, II, III] donde true = cheque marcado.
 */
export type MapaConducta = Map<number, (boolean | null)[]>;

export interface AnalisisBoleta {
  materias: MateriaResultado[];
  conducta: MapaConducta;
}

/** Promedio ponderado de una serie de notas. */
export function calcularPromedioPonderado(notas: number[], ponderaciones: number[]): number {
  if (notas.length === 0) return 0;
  let totalNota = 0;
  let totalPonderacion = 0;
  notas.forEach((nota, index) => {
    totalNota += nota * (ponderaciones[index] ?? 0);
    totalPonderacion += ponderaciones[index] ?? 0;
  });
  return totalPonderacion > 0 ? totalNota / totalPonderacion : 0;
}

/**
 * Analiza los datos de la boleta y devuelve:
 *  - los promedios por materia (excluyendo los ítems de conducta), y
 *  - el estado de cada ítem de conducta por trimestre.
 *
 * Una actividad se considera de conducta si su nombre empieza con "número."
 * y ese número existe en la configuración de conducta. En ese caso no
 * participa en los promedios académicos (comportamiento histórico).
 */
export function analizarBoleta(datos: BoletaData, config: ReporteConfig): AnalisisBoleta {
  const numerosConducta = new Set<number>();
  for (const bloque of config.conducta?.bloques ?? []) {
    for (const item of bloque.items ?? []) {
      numerosConducta.add(item.numero);
    }
  }

  const conducta: MapaConducta = new Map();
  for (const numero of numerosConducta) {
    conducta.set(numero, [null, null, null]);
  }

  const trimestresValidos = new Set(
    (datos.trimestres ?? [])
      .map(t => Number(t.id))
      .filter(id => Number.isFinite(id) && id >= 1 && id <= 3)
  );

  const porMateria = new Map<
    number,
    { nombre: string; trimestres: { notas: number[]; ponderaciones: number[] }[] }
  >();
  for (const materia of datos.materias ?? []) {
    if (materia.id) {
      porMateria.set(materia.id, {
        nombre: materia.nombre,
        trimestres: [
          { notas: [], ponderaciones: [] },
          { notas: [], ponderaciones: [] },
          { notas: [], ponderaciones: [] },
        ],
      });
    }
  }

  const actividades = new Map((datos.actividades ?? []).map(a => [Number(a.id), a]));
  const notaMinima = config.conducta?.notaMinimaCheck ?? 5;

  for (const calificacion of datos.calificaciones ?? []) {
    const actividad = actividades.get(Number(calificacion.actividadId));
    if (!actividad) continue;

    const match = actividad.nombre.match(/^(\d+)\./);
    if (match) {
      const numero = parseInt(match[1], 10);
      if (numerosConducta.has(numero)) {
        const trimestreId = Number(actividad.trimestreId);
        if (trimestreId >= 1 && trimestreId <= 3) {
          const estado = conducta.get(numero);
          if (estado) {
            estado[trimestreId - 1] = Number(calificacion.nota) >= notaMinima;
          }
        }
        continue; // No entra a los promedios académicos.
      }
    }

    const registro = porMateria.get(Number(actividad.materiaId));
    if (registro && trimestresValidos.has(Number(actividad.trimestreId))) {
      const bucket = registro.trimestres[Number(actividad.trimestreId) - 1];
      bucket.notas.push(Number(calificacion.nota));
      bucket.ponderaciones.push(Number(actividad.ponderacion));
    }
  }

  const materias: MateriaResultado[] = [];
  porMateria.forEach((registro, id) => {
    const t1 = calcularPromedioPonderado(registro.trimestres[0].notas, registro.trimestres[0].ponderaciones);
    const t2 = calcularPromedioPonderado(registro.trimestres[1].notas, registro.trimestres[1].ponderaciones);
    const t3 = calcularPromedioPonderado(registro.trimestres[2].notas, registro.trimestres[2].ponderaciones);
    const total = t1 + t2 + t3;
    materias.push({
      id,
      nombre: registro.nombre,
      trimestres: [t1, t2, t3],
      total,
      promedio: total > 0 ? total / 3 : 0,
      sinNotas: total === 0,
    });
  });

  return { materias, conducta };
}

/**
 * Columnas visibles de la tabla de asignaturas en el orden de impresión.
 */
export function columnasVisibles(config: ReporteConfig): ColumnaReporte[] {
  const columnas: ColumnaReporte[] = [
    { clave: 'materia', etiqueta: config.materias?.etiquetaMateria || 'ASIGNATURAS' },
  ];
  const trimestres = config.materias?.columnas?.trimestres ?? [];
  trimestres.forEach((t, index) => {
    if (t.visible) {
      columnas.push({ clave: `t${index + 1}` as ClaveColumna, etiqueta: t.etiqueta });
    }
  });
  if (config.materias?.columnas?.total?.visible) {
    columnas.push({ clave: 'total', etiqueta: config.materias.columnas.total.etiqueta });
  }
  if (config.materias?.columnas?.promedio?.visible) {
    columnas.push({ clave: 'promedio', etiqueta: config.materias.columnas.promedio.etiqueta });
  }
  return columnas;
}

/** Formatea un número con la cantidad de decimales indicada. */
export function formatearNumero(valor: number, decimales: number): string {
  const seguro = Number.isFinite(valor) ? valor : 0;
  const redondeos = Math.max(0, Math.min(4, Math.trunc(decimales ?? 0)));
  return seguro.toFixed(redondeos);
}

/** Texto de un ítem de conducta con su número (alinea de 1 a 9 con 10+). */
export function textoItemConducta(numero: number, texto: string): string {
  const prefijo = numero < 10 ? `${numero}.  ` : `${numero}. `;
  return `${prefijo}${texto}`;
}
