import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionMaterias } from './gestion-materias';

describe('GestionMaterias', () => {
  let component: GestionMaterias;
  let fixture: ComponentFixture<GestionMaterias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionMaterias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionMaterias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
