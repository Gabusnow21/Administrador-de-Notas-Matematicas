import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Reporte } from './reporte';
import { BoletaData } from './ticket.service';
import { CONFIGURACION_REPORTE_POR_DEFECTO, clonarConfig } from './reporte-config.service';

/** Datos de prueba: 3 materias con notas y los 15 ítems de conducta. */
function datosEjemplo(): BoletaData {
  const materias = [
    { id: 1, nombre: 'Matemáticas' },
    { id: 2, nombre: 'Lenguaje' },
    { id: 3, nombre: 'Ciencias' },
  ];
  const trimestres = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const actividades: BoletaData['actividades'] = [];
  const calificaciones: BoletaData['calificaciones'] = [];
  let id = 1;

  for (const materia of materias) {
    for (const trimestre of [1, 2, 3]) {
      actividades.push({
        id,
        nombre: `Examen ${materia.nombre} T${trimestre}`,
        ponderacion: 10,
        materiaId: materia.id,
        trimestreId: trimestre,
      });
      calificaciones.push({ nota: 6 + ((materia.id + trimestre) % 5), actividadId: id });
      id++;
    }
  }

  for (let numero = 1; numero <= 15; numero++) {
    for (const trimestre of [1, 2, 3]) {
      actividades.push({
        id,
        nombre: `${numero}. Aspecto de conducta`,
        ponderacion: 5,
        materiaId: 1,
        trimestreId: trimestre,
      });
      calificaciones.push({ nota: numero % 3 === 0 ? 2 : 10, actividadId: id });
      id++;
    }
  }

  return {
    estudiante: { nombres: 'Juan Carlos', apellidos: 'Martínez Ruiz', codigoProgreso: '20240001' },
    materias,
    trimestres,
    actividades,
    calificaciones,
  };
}

/** Lee el PDF como texto (jsPDF no comprime por defecto, el texto plano es buscable). */
function textoPdf(blob: Blob): Promise<string> {
  // jsdom no implementa Blob.arrayBuffer: se usa FileReader.
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(new TextDecoder('latin1').decode(lector.result as ArrayBuffer));
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer el PDF'));
    lector.readAsArrayBuffer(blob);
  });
}

describe('Reporte', () => {
  let service: Reporte;
  const datos = datosEjemplo();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Reporte);
  });

  it('debería crearse', () => {
    expect(service).toBeTruthy();
  });

  it('genera un PDF con la configuración por defecto (reproduce el reporte histórico)', async () => {
    const blob = service.generarPdfDesdeDatos(datos, clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO));

    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/pdf');

    const texto = await textoPdf(blob);
    // Tabla de asignaturas con todas sus columnas
    expect(texto).toContain('ASIGNATURAS');
    expect(texto).toContain('I TRIMESTRE');
    expect(texto).toContain('PROMEDIO');
    // Bloques de conducta
    expect(texto).toContain('POSITIVOS');
    expect(texto).toContain('A MEJORAR');
    // Cabecera
    expect(texto).toContain('REGISTRO ACAD');
    // Orientación vertical A4
    expect(texto).toContain('MediaBox [0 0 595');
  });

  it('respeta una configuración personalizada', async () => {
    const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    config.encabezado.titulo = 'INFORME PERSONALIZADO DE PRUEBA';
    config.encabezado.codigo = '00000';
    config.conducta.habilitado = false;
    config.materias.columnas.promedio.visible = false;
    config.materias.columnas.trimestres[2].visible = false;
    config.pie.habilitado = false;
    config.estilos.orientacion = 'landscape';

    const blob = service.generarPdfDesdeDatos(datos, config);
    const texto = await textoPdf(blob);

    expect(texto).toContain('INFORME PERSONALIZADO DE PRUEBA');
    expect(texto).not.toContain('REGISTRO ACAD');
    expect(texto).not.toContain('PROMEDIO');
    expect(texto).not.toContain('III TRIMESTRE');
    expect(texto).not.toContain('POSITIVOS');
    expect(texto).not.toContain('Efesios 6:4');
    // Orientación horizontal A4
    expect(texto).toContain('MediaBox [0 0 841');
  });

  it('usa la configuración vigente del servicio cuando no se envía ninguna', () => {
    const blob = service.generarPdfDesdeDatos(datos);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('genera un PDF aunque no haya datos de notas', () => {
    const vacio: BoletaData = {
      estudiante: { nombres: 'Sin', apellidos: 'Datos', codigoProgreso: '' },
      materias: [{ id: 1, nombre: 'Única' }],
      trimestres: [{ id: 1 }],
      actividades: [],
      calificaciones: [],
    };

    const blob = service.generarPdfDesdeDatos(vacio, clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO));
    expect(blob.size).toBeGreaterThan(500);
  });
});
