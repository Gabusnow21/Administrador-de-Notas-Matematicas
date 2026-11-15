import { TestBed } from '@angular/core/testing';

import { UsuarioService } from './usuario';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('UsuarioService', () => {
  let service: UsuarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(UsuarioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
