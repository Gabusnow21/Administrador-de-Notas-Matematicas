import { BoletaData } from './ticket.service';
import {
  CONFIGURACION_REPORTE_POR_DEFECTO,
  clonarConfig,
  fusionarConfig,
  validarConfig,
} from './reporte-config.service';
import {
  analizarBoleta,
  calcularPromedioPonderado,
  columnasVisibles,
  formatearNumero,
  textoItemConducta,
} from './reporte.utils';

function datosEjemplo(): BoletaData {
  return {
    estudiante: { nombres: 'Ana', apellidos: 'Pérez', codigoProgreso: '12345678' },
    materias: [
      { id: 1, nombre: 'Matemáticas' },
      { id: 2, nombre: 'Lenguaje' },
    ],
    trimestres: [{ id: 1 }, { id: 2 }, { id: 3 }],
    actividades: [
      { id: 1, nombre: 'Examen T1', ponderacion: 10, materiaId: 1, trimestreId: 1 },
      { id: 2, nombre: 'Tarea T2', ponderacion: 20, materiaId: 1, trimestreId: 2 },
      { id: 3, nombre: 'Lectura T1', ponderacion: 10, materiaId: 2, trimestreId: 1 },
      // Ítems de conducta (el prefijo numérico determina el ítem)
      { id: 10, nombre: '1. Coopera y participa', ponderacion: 5, materiaId: 1, trimestreId: 1 },
      { id: 11, nombre: '1. Coopera y participa', ponderacion: 5, materiaId: 1, trimestreId: 2 },
      { id: 20, nombre: '7. Ausencia sin justificar', ponderacion: 5, materiaId: 1, trimestreId: 1 },
    ],
    calificaciones: [
      { nota: 8, actividadId: 1 },
      { nota: 10, actividadId: 2 },
      { nota: 6, actividadId: 3 },
      { nota: 10, actividadId: 10 }, // check en I
      { nota: 3, actividadId: 11 }, // sin check en II
      { nota: 9, actividadId: 20 }, // check en I
    ],
  };
}

describe('reporte.utils', () => {
  describe('calcularPromedioPonderado', () => {
    it('promedia por ponderación', () => {
      expect(calcularPromedioPonderado([8, 10], [10, 20])).toBeCloseTo(280 / 30, 5);
    });

    it('devuelve 0 sin notas', () => {
      expect(calcularPromedioPonderado([], [])).toBe(0);
    });

    it('devuelve 0 si la ponderación total es 0', () => {
      expect(calcularPromedioPonderado([8, 10], [0, 0])).toBe(0);
    });
  });

  describe('analizarBoleta', () => {
    it('excluye los ítems de conducta de los promedios académicos', () => {
      const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      const { materias } = analizarBoleta(datosEjemplo(), config);

      // Matemáticas solo debe considerar "Examen T1" y "Tarea T2".
      const matematicas = materias.find(m => m.nombre === 'Matemáticas')!;
      expect(matematicas.trimestres[0]).toBeCloseTo(8, 5); // T1: solo el examen
      expect(matematicas.trimestres[1]).toBeCloseTo(10, 5); // T2: solo la tarea
      expect(matematicas.trimestres[2]).toBe(0);
      expect(matematicas.total).toBeCloseTo(18, 5);
      expect(matematicas.promedio).toBeCloseTo(6, 5);
      expect(matematicas.sinNotas).toBe(false);
    });

    it('marca el cheque cuando la nota alcanza la mínima configurada', () => {
      const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      const { conducta } = analizarBoleta(datosEjemplo(), config);

      expect(conducta.get(1)).toEqual([true, false, null]);
      expect(conducta.get(7)).toEqual([true, null, null]);
    });

    it('respeta una nota mínima personalizada', () => {
      const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      config.conducta.notaMinimaCheck = 10;
      const { conducta } = analizarBoleta(datosEjemplo(), config);

      expect(conducta.get(7)).toEqual([false, null, null]); // nota 9 < 10
      expect(conducta.get(1)).toEqual([true, false, null]); // nota 10 >= 10
    });

    it('ignora materias y trimestres que no existen', () => {
      const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      const datos = datosEjemplo();
      datos.trimestres = [{ id: 1 }];
      datos.materias = [{ id: 99, nombre: 'Inexistente' }];

      const { materias, conducta } = analizarBoleta(datos, config);
      expect(materias).toHaveLength(1);
      expect(materias[0].sinNotas).toBe(true);
      // La conducta usa el trimestre de la actividad (1..3), no la lista de trimestres.
      expect(conducta.get(1)).toEqual([true, false, null]);
    });

    it('no marca nada cuando la conducta no tiene actividad asociada', () => {
      const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      const { conducta } = analizarBoleta(datosEjemplo(), config);
      expect(conducta.get(15)).toEqual([null, null, null]);
    });
  });

  describe('columnasVisibles', () => {
    it('devuelve todas las columnas por defecto', () => {
      const columnas = columnasVisibles(clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO));
      expect(columnas.map(c => c.etiqueta)).toEqual([
        'ASIGNATURAS',
        'I TRIMESTRE',
        'II TRIMESTRE',
        'III TRIMESTRE',
        'TOTAL',
        'PROMEDIO',
      ]);
    });

    it('respeta las columnas ocultas y sus etiquetas', () => {
      const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
      config.materias.columnas.trimestres[1].visible = false;
      config.materias.columnas.total.visible = false;
      config.materias.columnas.promedio.etiqueta = 'FINAL';

      const columnas = columnasVisibles(config);
      expect(columnas.map(c => c.clave)).toEqual(['materia', 't1', 't3', 'promedio']);
      expect(columnas.at(-1)?.etiqueta).toBe('FINAL');
    });
  });

  describe('formatearNumero', () => {
    it('formatea con la cantidad de decimales indicada', () => {
      expect(formatearNumero(9.3333, 2)).toBe('9.33');
      expect(formatearNumero(9.6, 0)).toBe('10');
      expect(formatearNumero(0, 2)).toBe('0.00');
    });

    it('limita los decimales entre 0 y 4 y tolera valores no numéricos', () => {
      expect(formatearNumero(NaN, 2)).toBe('0.00');
      expect(formatearNumero(9.876543, 99)).toBe('9.8765');
      expect(formatearNumero(9.876543, -3)).toBe('10');
    });
  });

  describe('textoItemConducta', () => {
    it('alinea los números de un y dos dígitos', () => {
      expect(textoItemConducta(1, 'Coopera')).toBe('1.  Coopera');
      expect(textoItemConducta(15, 'Deméritos')).toBe('15. Deméritos');
    });
  });
});

describe('configuración de reporte', () => {
  it('la configuración por defecto es válida', () => {
    expect(validarConfig(clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO))).toEqual([]);
  });

  it('los valores por defecto reproducen el reporte histórico', () => {
    const config = CONFIGURACION_REPORTE_POR_DEFECTO;
    expect(config.encabezado.titulo).toBe('REGISTRO ACADÉMICO DE MATERIAS COMPLEMENTARIAS');
    expect(config.conducta.bloques).toHaveLength(2);
    expect(config.conducta.bloques[0].items).toHaveLength(6); // POSITIVOS
    expect(config.conducta.bloques[1].items).toHaveLength(9); // A MEJORAR
    expect(config.conducta.notaMinimaCheck).toBe(5);
    expect(config.materias.decimales).toBe(2);
    expect(config.materias.decimalesPromedio).toBe(0);
    expect(config.estilos.orientacion).toBe('portrait');
  });

  it('fusiona configuraciones parciales sobre los valores por defecto', () => {
    const parcial = {
      encabezado: { institucion: 'Otra escuela' },
      estilos: { orientacion: 'landscape' },
    };
    const resultado = fusionarConfig(CONFIGURACION_REPORTE_POR_DEFECTO, parcial);

    expect(resultado.encabezado.institucion).toBe('Otra escuela');
    // Campos no tocados se conservan
    expect(resultado.encabezado.codigo).toBe(CONFIGURACION_REPORTE_POR_DEFECTO.encabezado.codigo);
    expect(resultado.materias.columnas.trimestres).toHaveLength(3);
    expect(resultado.estilos.orientacion).toBe('landscape');
    expect(resultado.estilos.tamanoFuente).toBe(10);
  });

  it('usa los valores por defecto cuando la configuración guardada es inválida', () => {
    expect(fusionarConfig(CONFIGURACION_REPORTE_POR_DEFECTO, 'no soy un objeto').encabezado.codigo).toBe(
      CONFIGURACION_REPORTE_POR_DEFECTO.encabezado.codigo
    );
    expect(fusionarConfig(CONFIGURACION_REPORTE_POR_DEFECTO, null).conducta.bloques).toHaveLength(2);
  });

  it('detecta errores de configuración', () => {
    const sinColumnas = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    sinColumnas.materias.columnas.trimestres.forEach(t => (t.visible = false));
    sinColumnas.materias.columnas.total.visible = false;
    sinColumnas.materias.columnas.promedio.visible = false;
    expect(validarConfig(sinColumnas).length).toBeGreaterThan(0);

    const conductaVacia = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    conductaVacia.conducta.bloques = [{ id: 'vacio', titulo: 'VACIO', items: [] }];
    expect(validarConfig(conductaVacia).length).toBeGreaterThan(0);

    const numerosRepetidos = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    numerosRepetidos.conducta.bloques[0].items[1].numero = numerosRepetidos.conducta.bloques[0].items[0].numero;
    expect(validarConfig(numerosRepetidos).length).toBeGreaterThan(0);

    const colorInvalido = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    colorInvalido.estilos.colorPrimario = 'azul';
    expect(validarConfig(colorInvalido).length).toBeGreaterThan(0);

    const institucionVacia = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    institucionVacia.encabezado.institucion = '  ';
    expect(validarConfig(institucionVacia).length).toBeGreaterThan(0);
  });
});
