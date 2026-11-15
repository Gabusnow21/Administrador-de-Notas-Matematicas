import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NfcTerminalComponent } from './nfc-terminal';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('NfcTerminalComponent', () => {
  let component: NfcTerminalComponent;
  let fixture: ComponentFixture<NfcTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NfcTerminalComponent],
        providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NfcTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
