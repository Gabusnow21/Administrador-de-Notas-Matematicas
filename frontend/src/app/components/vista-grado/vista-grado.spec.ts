import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaGrado } from './vista-grado';

describe('VistaGrado', () => {
  let component: VistaGrado;
  let fixture: ComponentFixture<VistaGrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaGrado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VistaGrado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
