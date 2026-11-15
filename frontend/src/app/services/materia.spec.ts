import { TestBed } from '@angular/core/testing';

import { MateriaService } from './materia';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('MateriaService', () => {
  let service: MateriaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(MateriaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
