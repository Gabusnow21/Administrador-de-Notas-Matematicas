import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionRecompensasComponent } from './gestion-recompensas';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('GestionRecompensasComponent', () => {
  let component: GestionRecompensasComponent;
  let fixture: ComponentFixture<GestionRecompensasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionRecompensasComponent],
        providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionRecompensasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
