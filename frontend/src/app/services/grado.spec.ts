import { TestBed } from '@angular/core/testing';

import { GradoService } from './grado';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('GradoService', () => {
  let service: GradoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(GradoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
