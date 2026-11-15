import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaGrado } from './vista-grado';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('VistaGrado', () => {
  let component: VistaGrado;
  let fixture: ComponentFixture<VistaGrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaGrado],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VistaGrado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
