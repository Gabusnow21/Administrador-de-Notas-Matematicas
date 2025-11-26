import { TestBed } from '@angular/core/testing';

import { Trimestre } from './trimestre';

describe('Trimestre', () => {
  let service: Trimestre;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Trimestre);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
