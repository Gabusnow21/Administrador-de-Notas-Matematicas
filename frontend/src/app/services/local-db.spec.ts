import { TestBed } from '@angular/core/testing';

import { LocalDb } from './local-db';

describe('LocalDb', () => {
  let service: LocalDb;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalDb);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
