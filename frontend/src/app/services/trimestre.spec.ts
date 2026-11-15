import { TestBed } from '@angular/core/testing';

import { TrimestreService } from './trimestre';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('TrimestreService', () => {
  let service: TrimestreService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(TrimestreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
