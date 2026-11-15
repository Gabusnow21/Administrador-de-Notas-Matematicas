import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    // El componente usa el global `bootstrap` de Bootstrap JS (no disponible en jsdom).
    (globalThis as Record<string, unknown>)['bootstrap'] = {
      Modal: class {
        hide() {}
        show() {}
        toggle() {}
      },
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
