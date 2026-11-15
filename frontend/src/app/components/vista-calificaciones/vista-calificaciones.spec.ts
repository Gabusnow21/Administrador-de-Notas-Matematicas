import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaCalificaciones } from './vista-calificaciones';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('VistaCalificaciones', () => {
  let component: VistaCalificaciones;
  let fixture: ComponentFixture<VistaCalificaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaCalificaciones],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VistaCalificaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
