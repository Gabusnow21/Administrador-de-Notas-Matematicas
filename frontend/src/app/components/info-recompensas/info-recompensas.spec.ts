import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoRecompensas } from './info-recompensas';

describe('InfoRecompensas', () => {
  let component: InfoRecompensas;
  let fixture: ComponentFixture<InfoRecompensas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoRecompensas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoRecompensas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
