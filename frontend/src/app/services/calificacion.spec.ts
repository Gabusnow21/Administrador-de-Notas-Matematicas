import { TestBed } from '@angular/core/testing';

import { Calificacion } from './calificacion';

describe('Calificacion', () => {
  let service: Calificacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Calificacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
