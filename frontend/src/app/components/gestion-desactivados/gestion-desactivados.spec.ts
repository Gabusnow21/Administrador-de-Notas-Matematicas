import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionDesactivados } from './gestion-desactivados';

describe('GestionDesactivados', () => {
  let component: GestionDesactivados;
  let fixture: ComponentFixture<GestionDesactivados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDesactivados],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionDesactivados);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
