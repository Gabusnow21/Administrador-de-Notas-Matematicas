import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { GestionReportes } from './gestion-reportes';
import { CONFIGURACION_REPORTE_POR_DEFECTO } from '../../services/reporte-config.service';
import { environment } from '../../environments/environment';

const URL_CONFIG = `${environment.apiUrl}/configuracion/reporte-boleta`;

describe('GestionReportes', () => {
  let component: GestionReportes;
  let fixture: ComponentFixture<GestionReportes>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionReportes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionReportes);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function cargarConfiguracion(): Promise<void> {
    fixture.detectChanges(); // dispara ngOnInit -> GET de la plantilla
    httpMock.expectOne(URL_CONFIG).flush({});
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  it('debería crearse', async () => {
    await cargarConfiguracion();
    expect(component).toBeTruthy();
    expect(component.cargando).toBe(false);
    expect(component.borrador.encabezado.titulo).toBe(CONFIGURACION_REPORTE_POR_DEFECTO.encabezado.titulo);
  });

  it('marca cambios y guarda la configuración válida', async () => {
    await cargarConfiguracion();

    component.borrador.encabezado.institucion = 'Nueva Institución';
    component.marcarSucio();
    expect(component.sucio).toBe(true);

    component.guardar();

    const peticion = httpMock.expectOne(URL_CONFIG);
    expect(peticion.request.method).toBe('PUT');
    peticion.request.body.encabezado.institucion = 'Nueva Institución';
    peticion.flush({});

    expect(component.sucio).toBe(false);
    expect(component.errores).toEqual([]);
  });

  it('no guarda si la configuración es inválida', async () => {
    await cargarConfiguracion();

    component.borrador.materias.columnas.trimestres.forEach(t => (t.visible = false));
    component.borrador.materias.columnas.total.visible = false;
    component.borrador.materias.columnas.promedio.visible = false;

    component.guardar();

    expect(component.errores.length).toBeGreaterThan(0);
    httpMock.expectNone({ method: 'PUT' });
  });

  it('restaura los valores por defecto en el borrador', async () => {
    await cargarConfiguracion();

    component.borrador.encabezado.institucion = 'Modificada';
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.restaurarPorDefecto();

    expect(component.borrador.encabezado.institucion).toBe(
      CONFIGURACION_REPORTE_POR_DEFECTO.encabezado.institucion
    );
    expect(component.sucio).toBe(true);
  });

  it('permite administrar bloques e ítems de conducta', async () => {
    await cargarConfiguracion();

    const bloquesIniciales = component.borrador.conducta.bloques.length;
    component.agregarBloque();
    expect(component.borrador.conducta.bloques).toHaveLength(bloquesIniciales + 1);

    const bloque = component.borrador.conducta.bloques.at(-1)!;
    expect(bloque.items).toHaveLength(0);

    component.agregarItem(bloque);
    expect(bloque.items).toHaveLength(1);
    expect(bloque.items[0].numero).toBe(16); // siguiente número libre (1..15 en uso)

    component.agregarItem(bloque);
    component.moverItem(bloque, 1, -1);
    expect(bloque.items[1].numero).toBe(16);

    component.eliminarItem(bloque, 0);
    expect(bloque.items).toHaveLength(1);
  });
});
