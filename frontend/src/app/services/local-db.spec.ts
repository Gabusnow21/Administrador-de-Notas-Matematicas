import { TestBed } from '@angular/core/testing';

import { LocalDbService } from './local-db';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('LocalDbService', () => {
  let service: LocalDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(LocalDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
