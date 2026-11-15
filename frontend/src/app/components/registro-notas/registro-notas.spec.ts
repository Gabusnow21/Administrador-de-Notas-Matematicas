import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroNotas } from './registro-notas';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('RegistroNotas', () => {
  let component: RegistroNotas;
  let fixture: ComponentFixture<RegistroNotas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroNotas],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroNotas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
