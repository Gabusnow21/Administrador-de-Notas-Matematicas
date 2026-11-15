import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../environments/environment';
import {
  CONFIGURACION_REPORTE_POR_DEFECTO,
  REPORTE_CONFIG_STORAGE,
  ReporteConfigService,
  clonarConfig,
} from './reporte-config.service';

describe('ReporteConfigService', () => {
  let service: ReporteConfigService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/configuracion/reporte-boleta`;

  beforeEach(() => {
    localStorage.removeItem(REPORTE_CONFIG_STORAGE);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReporteConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify({ ignoreCancelled: true });
    localStorage.removeItem(REPORTE_CONFIG_STORAGE);
  });

  it('debería crearse con la configuración por defecto', () => {
    expect(service).toBeTruthy();
    expect(service.getSnapshot().encabezado.institucion).toBe(
      CONFIGURACION_REPORTE_POR_DEFECTO.encabezado.institucion
    );
  });

  it('ensureLoaded usa los valores por defecto si el servidor no tiene configuración', async () => {
    const promesa = service.ensureLoaded();

    httpMock.expectOne(url).flush({});

    const config = await promesa;
    expect(config.conducta.bloques).toHaveLength(2);
    expect(config.encabezado.titulo).toBe(CONFIGURACION_REPORTE_POR_DEFECTO.encabezado.titulo);
  });

  it('ensureLoaded aplica la configuración del servidor y la cachea localmente', async () => {
    const promesa = service.ensureLoaded();

    httpMock.expectOne(url).flush({
      encabezado: { institucion: 'Escuela de Prueba' },
      estilos: { orientacion: 'landscape' },
    });

    const config = await promesa;
    expect(config.encabezado.institucion).toBe('Escuela de Prueba');
    expect(config.estilos.orientacion).toBe('landscape');
    // Campos ausentes se reponen con los valores por defecto
    expect(config.materias.columnas.trimestres).toHaveLength(3);

    const cache = JSON.parse(localStorage.getItem(REPORTE_CONFIG_STORAGE)!);
    expect(cache.encabezado.institucion).toBe('Escuela de Prueba');
  });

  it('ensureLoaded mantiene la caché si el servidor falla', async () => {
    // Sembrar la caché local
    localStorage.setItem(
      REPORTE_CONFIG_STORAGE,
      JSON.stringify({ ...clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO), pie: { habilitado: true, texto: 'Desde caché' } })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const nuevoServicio = TestBed.inject(ReporteConfigService);
    const nuevoHttp = TestBed.inject(HttpTestingController);

    // La caché está disponible de inmediato (síncrono)
    expect(nuevoServicio.getSnapshot().pie.texto).toBe('Desde caché');

    const promesa = nuevoServicio.ensureLoaded();
    nuevoHttp.expectOne(url).error(new ProgressEvent('error'), { status: 0 });

    const config = await promesa;
    expect(config.pie.texto).toBe('Desde caché');
  });

  it('guardar persiste la configuración válida en el servidor', async () => {
    const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    config.encabezado.institucion = 'Institución Actualizada';

    let error: unknown = null;
    service.guardar(config).subscribe({ error: (e: unknown) => (error = e) });

    const peticion = httpMock.expectOne(url);
    expect(peticion.request.method).toBe('PUT');
    peticion.flush({});

    await Promise.resolve();
    expect(error).toBeNull();
    expect(service.getSnapshot().encabezado.institucion).toBe('Institución Actualizada');
    expect(localStorage.getItem(REPORTE_CONFIG_STORAGE)).toContain('Institución Actualizada');
  });

  it('guardar rechaza configuraciones inválidas sin llamar al servidor', () => {
    const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    config.materias.columnas.trimestres.forEach(t => (t.visible = false));
    config.materias.columnas.total.visible = false;
    config.materias.columnas.promedio.visible = false;

    let mensaje: string | null = null;
    service.guardar(config).subscribe({ error: (e: Error) => (mensaje = e.message) });

    expect(mensaje).toContain('al menos una columna visible');
    httpMock.expectNone(url);
  });

  it('restaurarPorDefecto vuelve al reporte histórico', () => {
    const config = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    config.estilos.orientacion = 'landscape';
    service.guardar(config).subscribe();
    httpMock.expectOne(url).flush({});

    const restaurada = service.restaurarPorDefecto();
    expect(restaurada.estilos.orientacion).toBe('portrait');
    expect(service.getSnapshot().estilos.orientacion).toBe('portrait');
  });

  it('recargar vuelve a pedir la configuración al servidor', async () => {
    const primera = service.ensureLoaded();
    httpMock.expectOne(url).flush({});
    await primera;

    const segunda = service.recargar();
    httpMock.expectOne(url).flush({ encabezado: { codigo: '999' } });
    const config = await segunda;
    expect(config.encabezado.codigo).toBe('999');
  });
});
