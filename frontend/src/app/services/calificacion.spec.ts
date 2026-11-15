import { TestBed } from '@angular/core/testing';

import { CalificacionService } from './calificacion';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('CalificacionService', () => {
  let service: CalificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(CalificacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
