import { TestBed } from '@angular/core/testing';

import { ActividadService } from './actividad';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('ActividadService', () => {
  let service: ActividadService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(ActividadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
