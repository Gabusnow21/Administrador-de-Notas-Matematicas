import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionUsuarios } from './gestion-usuarios';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('GestionUsuarios', () => {
  let component: GestionUsuarios;
  let fixture: ComponentFixture<GestionUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionUsuarios],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionUsuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
