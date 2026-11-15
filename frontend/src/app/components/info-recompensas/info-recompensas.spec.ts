import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoRecompensasComponent } from './info-recompensas';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('InfoRecompensasComponent', () => {
  let component: InfoRecompensasComponent;
  let fixture: ComponentFixture<InfoRecompensasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoRecompensasComponent],
        providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoRecompensasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
