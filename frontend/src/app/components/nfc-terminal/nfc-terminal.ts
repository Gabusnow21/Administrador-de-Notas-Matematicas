import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';

// Servicios y Modelos
import { WebNfcService, NfcMessage } from '../../services/web-nfc.service';
import { NfcInteractionService, TransaccionPayload } from '../../services/nfc-interaction.service';
import { Recompensa, RecompensaService } from '../../services/recompensa';
import { Estudiante, EstudianteService } from '../../services/estudiante';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-nfc-terminal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './nfc-terminal.html',
  styleUrls: ['./nfc-terminal.css']
})
export class NfcTerminalComponent implements OnInit, OnDestroy {
  // Inyección de servicios
  private webNfcService = inject(WebNfcService);
  private nfcInteractionService = inject(NfcInteractionService);
  private recompensaService = inject(RecompensaService);
  private estudianteService = inject(EstudianteService);
  private configuracionService = inject(ConfiguracionService);
  private fb = inject(FormBuilder);

  // Estado del componente
  isNfcSupported = false;
  isScanning = false;
  nfcMessage: { type: 'info' | 'success' | 'error', payload: string } | null = null;
  scannedNfcId: string | null = null;
  currentStudent: Estudiante | null = null;
  availableRewards: Recompensa[] = [];
  tokenName = 'Quiros'; // Default name

  // Formularios
  assignNfcForm: FormGroup;
  giveTokensForm: FormGroup;

  // Datos para asignación
  unassignedStudents: Estudiante[] = [];
  
  // Estados de carga para UX
  isAssigning = false;
  isGivingTokens = false;
  isRedeeming: { [key: number]: boolean } = {};

  private nfcSubscription: Subscription | undefined;

  constructor() {
    this.assignNfcForm = this.fb.group({
      estudianteId: ['', Validators.required]
    });
    this.giveTokensForm = this.fb.group({
      monto: [10, [Validators.required, Validators.min(1)]],
      descripcion: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.checkNfcSupport();
    this.loadInitialData();
    this.subscribeToNfcMessages();
  }

  ngOnDestroy(): void {
    this.nfcSubscription?.unsubscribe();
  }

  private checkNfcSupport(): void {
    this.isNfcSupported = 'NDEFReader' in window;
    if (!this.isNfcSupported) {
      this.nfcMessage = { type: 'error', payload: 'WebNFC no es soportado en este navegador. Usa Chrome en Android.' };
    }
  }

  private loadInitialData(): void {
    this.configuracionService.getTokenName().subscribe(name => this.tokenName = name);
    this.recompensaService.getRecompensas().subscribe(data => this.availableRewards = data);
    this.estudianteService.getEstudiantesSinNfc().subscribe(data => this.unassignedStudents = data);
  }

  private subscribeToNfcMessages(): void {
    this.nfcSubscription = this.webNfcService.getMessages().subscribe(message => {
      if (message.type === 'data') {
        if (message.payload?.serialNumber) {
          this.scannedNfcId = message.payload.serialNumber;
          if (this.scannedNfcId) { // <--- VERIFICACIÓN AÑADIDA AQUÍ
            this.lookupStudentByNfcId(this.scannedNfcId);
          }
        }
      } else {
        // Para 'info', 'success', 'error'
        this.nfcMessage = { type: message.type, payload: message.payload as string };
        if (message.type === 'error') {
          this.resetState();
          this.isScanning = false;
        }
      }
    });
  }

  startScan(): void {
    if (!this.isNfcSupported) return;
    this.resetState();
    this.webNfcService.scan();
    this.isScanning = true;
    this.nfcMessage = { type: 'info', payload: 'Lector activado. Acerque una tarjeta NFC...' };
  }

  private lookupStudentByNfcId(nfcId: string): void {
    this.nfcMessage = { type: 'info', payload: 'Leyendo información del estudiante...' };
    this.nfcInteractionService.getEstudiantePorNfcId(nfcId).subscribe({
      next: (estudiante) => {
        this.currentStudent = estudiante;
        this.nfcMessage = { type: 'success', payload: `Estudiante: ${estudiante.nombre} ${estudiante.apellido}` };
        this.isScanning = false;
      },
      error: () => {
        this.currentStudent = null;
        this.nfcMessage = { type: 'info', payload: `El Tag NFC no está asignado. Puede asignarlo a un estudiante de la lista.` };
        this.isScanning = false;
      }
    });
  }

  asignarNfc(): void {
    if (this.assignNfcForm.invalid || !this.scannedNfcId) return;
    
    this.isAssigning = true;
    const estudianteId = this.assignNfcForm.get('estudianteId')?.value;
    
    this.nfcInteractionService.asignarNfcAEstudiante(estudianteId, this.scannedNfcId).subscribe({
      next: (estudiante) => {
        this.currentStudent = estudiante;
        this.nfcMessage = { type: 'success', payload: `Tag asignado a ${estudiante.nombre} correctamente.` };
        this.estudianteService.getEstudiantesSinNfc().subscribe(data => this.unassignedStudents = data);
        this.assignNfcForm.reset();
        this.isAssigning = false;
      },
      error: (err) => {
        this.nfcMessage = { type: 'error', payload: `Error al asignar: ${err.error?.message || 'Error de servidor'}` };
        this.isAssigning = false;
      }
    });
  }

  darTokens(): void {
    if (this.giveTokensForm.invalid || !this.scannedNfcId) return;

    this.isGivingTokens = true;
    const { monto, descripcion } = this.giveTokensForm.value;
    const payload: TransaccionPayload = { nfcId: this.scannedNfcId, monto, descripcion, tipo: 'ACUMULACION' };

    this.nfcInteractionService.realizarTransaccion(payload).subscribe({
      next: (estudiante) => {
        this.currentStudent = estudiante;
        this.nfcMessage = { type: 'success', payload: `+${monto} ${this.tokenName} para ${estudiante.nombre}. Nuevo saldo: ${estudiante.saldoTokens}` };
        this.giveTokensForm.reset({ monto: 10, descripcion: '' });
        this.isGivingTokens = false;
      },
      error: (err) => {
        this.nfcMessage = { type: 'error', payload: `Error al acreditar: ${err.error?.message || 'Error de servidor'}` };
        this.isGivingTokens = false;
      }
    });
  }

  canjearRecompensa(recompensa: Recompensa): void {
    if (!this.scannedNfcId || !this.currentStudent || !recompensa.costo) return;

    if ((this.currentStudent.saldoTokens ?? 0) < recompensa.costo) {
      this.nfcMessage = { type: 'error', payload: 'Saldo insuficiente para este canje.' };
      return;
    }
    
    this.isRedeeming[recompensa.id!] = true;
    const payload: TransaccionPayload = { nfcId: this.scannedNfcId, monto: recompensa.costo, descripcion: `Canje: ${recompensa.nombre}`, tipo: 'CANJE' };

    this.nfcInteractionService.realizarTransaccion(payload).subscribe({
      next: (estudiante) => {
        this.currentStudent = estudiante;
        this.nfcMessage = { type: 'success', payload: `Canje de '${recompensa.nombre}' exitoso. Nuevo saldo: ${estudiante.saldoTokens}` };
        delete this.isRedeeming[recompensa.id!];
      },
      error: (err) => {
        this.nfcMessage = { type: 'error', payload: `Error en el canje: ${err.error?.message || 'Error de servidor'}` };
        delete this.isRedeeming[recompensa.id!];
      }
    });
  }

  private resetState(): void {
    this.scannedNfcId = null;
    this.currentStudent = null;
    this.nfcMessage = null;
    this.assignNfcForm.reset();
    this.giveTokensForm.reset({ monto: 10, descripcion: '' });
  }

  getEstudianteFullName(estudiante: Estudiante): string {
    return `${estudiante.nombre} ${estudiante.apellido}`;
  }
}