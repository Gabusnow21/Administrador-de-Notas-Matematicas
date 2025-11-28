import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionActividades } from './gestion-actividades';

describe('GestionActividades', () => {
  let component: GestionActividades;
  let fixture: ComponentFixture<GestionActividades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionActividades]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionActividades);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
