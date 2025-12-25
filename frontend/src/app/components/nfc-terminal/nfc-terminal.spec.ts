import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NfcTerminal } from './nfc-terminal';

describe('NfcTerminal', () => {
  let component: NfcTerminal;
  let fixture: ComponentFixture<NfcTerminal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NfcTerminal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NfcTerminal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
