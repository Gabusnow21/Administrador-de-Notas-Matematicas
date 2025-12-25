import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionRecompensas } from './gestion-recompensas';

describe('GestionRecompensas', () => {
  let component: GestionRecompensas;
  let fixture: ComponentFixture<GestionRecompensas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionRecompensas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionRecompensas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
