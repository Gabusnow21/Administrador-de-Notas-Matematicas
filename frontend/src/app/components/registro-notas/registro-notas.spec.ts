import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroNotas } from './registro-notas';

describe('RegistroNotas', () => {
  let component: RegistroNotas;
  let fixture: ComponentFixture<RegistroNotas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroNotas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroNotas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
