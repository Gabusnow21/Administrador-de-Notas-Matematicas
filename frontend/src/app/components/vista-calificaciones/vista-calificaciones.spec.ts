import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaCalificaciones } from './vista-calificaciones';

describe('VistaCalificaciones', () => {
  let component: VistaCalificaciones;
  let fixture: ComponentFixture<VistaCalificaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaCalificaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VistaCalificaciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
