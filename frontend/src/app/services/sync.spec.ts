import { TestBed } from '@angular/core/testing';

import { SyncService } from './sync';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(SyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
