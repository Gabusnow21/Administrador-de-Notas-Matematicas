import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

// Servicios y Modelos
import { WebNfcService, NfcMessage } from '../../services/web-nfc.service';
import { NfcInteractionService, TransaccionPayload } from '../../services/nfc-interaction.service';
import { Recompensa, RecompensaService } from '../../services/recompensa';
import { Estudiante, EstudianteService } from '../../services/estudiante';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-nfc-terminal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  nfcMessage: NfcMessage | null = null;
  scannedNfcId: string | null = null;
  currentStudent: Estudiante | null = null;
  availableRewards: Recompensa[] = [];
  tokenName = 'Quiros'; // Nombre por defecto, se cargará de la configuración

  // Formularios
  assignNfcForm: FormGroup;
  giveTokensForm: FormGroup;

  // Datos para asignación NFC
  unassignedStudents: Estudiante[] = [];

  private nfcSubscription: Subscription | undefined;

  constructor() {
    // Inicializar formularios
    this.assignNfcForm = this.fb.group({
      estudianteId: ['', Validators.required]
    });
    this.giveTokensForm = this.fb.group({
      monto: [0, [Validators.required, Validators.min(1)]],
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
    this.stopScan(); // Asegurarse de detener el escaneo al salir
  }

  // --- Inicialización y carga de datos ---
  private checkNfcSupport(): void {
    this.isNfcSupported = 'NDEFReader' in window;
    if (!this.isNfcSupported) {
      this.nfcMessage = { type: 'error', payload: 'WebNFC no es soportado en este navegador o dispositivo. Asegúrate de usar Chrome en Android.' };
    }
  }

  private loadInitialData(): void {
    this.configuracionService.getTokenName().subscribe(name => this.tokenName = name);
    this.recompensaService.getRecompensas().subscribe(data => this.availableRewards = data);
    this.estudianteService.getEstudiantesSinNfc().subscribe(data => this.unassignedStudents = data);
  }

  // --- Suscripción a mensajes NFC ---
  private subscribeToNfcMessages(): void {
    this.nfcSubscription = this.webNfcService.getMessages().subscribe(message => {
      this.nfcMessage = message;
      if (message.type === 'success' && message.payload.serialNumber) {
        this.scannedNfcId = message.payload.serialNumber;
        if (this.scannedNfcId) { // <-- AÑADIR ESTA VERIFICACIÓN
          this.lookupStudentByNfcId(this.scannedNfcId);
        }
      } else if (message.type === 'error') {
        this.scannedNfcId = null;
        this.currentStudent = null;
      }
    });
  }

  // --- Control de escaneo NFC ---
  startScan(): void {
    if (!this.isNfcSupported) return;
    this.webNfcService.scan();
    this.isScanning = true;
    this.nfcMessage = { type: 'info', payload: 'Acerque una tarjeta NFC para escanear...' };
    this.resetState();
  }

  stopScan(): void {
    // WebNFC no tiene un método 'stop' explícito en la especificación actual
    // Simplemente deja de escuchar después de un tiempo o cuando se cierra la página
    this.isScanning = false;
    this.nfcMessage = { type: 'info', payload: 'Escaneo detenido.' };
  }

  // --- Lógica del estudiante ---
  lookupStudentByNfcId(nfcId: string): void {
    this.nfcInteractionService.getEstudiantePorNfcId(nfcId).subscribe({
      next: (estudiante) => {
        this.currentStudent = estudiante;
        this.nfcMessage = { type: 'success', payload: `Estudiante encontrado: ${estudiante.nombre} ${estudiante.apellido}` };
      },
      error: (err) => {
        this.currentStudent = null;
        if (err.status === 404) {
          this.nfcMessage = { type: 'info', payload: `NFC ID "${nfcId}" no asignado a ningún estudiante.` };
        } else {
          this.nfcMessage = { type: 'error', payload: 'Error al buscar estudiante: ' + (err.error?.message || err.message) };
        }
      }
    });
  }

  // --- Asignar NFC ---
  asignarNfc(): void {
    if (this.assignNfcForm.invalid || !this.scannedNfcId) {
      return;
    }
    const estudianteId = this.assignNfcForm.get('estudianteId')?.value;

    this.nfcInteractionService.asignarNfcAEstudiante(estudianteId, this.scannedNfcId).subscribe({
      next: (estudiante) => {
        this.currentStudent = estudiante;
        this.nfcMessage = { type: 'success', payload: `NFC ID asignado a ${estudiante.nombre} ${estudiante.apellido} exitosamente.` };
        this.estudianteService.getEstudiantesSinNfc().subscribe(data => this.unassignedStudents = data); // Recargar lista
        this.assignNfcForm.reset();
      },
      error: (err) => {
        this.nfcMessage = { type: 'error', payload: 'Error al asignar NFC: ' + (err.error?.message || err.message) };
      }
    });
  }

  // --- Dar Tokens ---
  darTokens(): void {
    if (this.giveTokensForm.invalid || !this.scannedNfcId || !this.currentStudent) {
      return;
    }
    const { monto, descripcion } = this.giveTokensForm.value;
    const payload: TransaccionPayload = {
      nfcId: this.scannedNfcId,
      monto: monto,
      descripcion: descripcion,
      tipo: 'ACUMULACION'
    };

    this.nfcInteractionService.realizarTransaccion(payload).subscribe({
      next: (estudianteActualizado) => {
        this.currentStudent = estudianteActualizado;
        this.nfcMessage = { type: 'success', payload: `Se añadieron ${monto} ${this.tokenName} a ${estudianteActualizado.nombre}. Saldo actual: ${estudianteActualizado.saldoTokens}` };
        this.giveTokensForm.reset({ monto: 0, descripcion: '' });
      },
      error: (err) => {
        this.nfcMessage = { type: 'error', payload: 'Error al dar tokens: ' + (err.error?.message || err.message) };
      }
    });
  }

  // --- Canjear Recompensa ---
  canjearRecompensa(recompensa: Recompensa): void {
    if (!this.scannedNfcId || !this.currentStudent || !recompensa.costo) {
      this.nfcMessage = { type: 'error', payload: 'Datos incompletos para canjear recompensa.' };
      return;
    }

    if (this.currentStudent.saldoTokens === undefined || this.currentStudent.saldoTokens < recompensa.costo) {
      this.nfcMessage = { type: 'error', payload: `Saldo insuficiente. Necesitas ${recompensa.costo} ${this.tokenName}. Tienes ${this.currentStudent.saldoTokens || 0}.` };
      return;
    }

    if (!confirm(`¿Confirmas el canje de "${recompensa.nombre}" por ${recompensa.costo} ${this.tokenName} para ${this.currentStudent.nombre}?`)) {
      return;
    }

    const payload: TransaccionPayload = {
      nfcId: this.scannedNfcId,
      monto: recompensa.costo,
      descripcion: `Canje de recompensa: ${recompensa.nombre}`,
      tipo: 'CANJE'
    };

    this.nfcInteractionService.realizarTransaccion(payload).subscribe({
      next: (estudianteActualizado) => {
        this.currentStudent = estudianteActualizado;
        this.nfcMessage = { type: 'success', payload: `Canje de "${recompensa.nombre}" exitoso. Saldo actual: ${estudianteActualizado.saldoTokens}` };
      },
      error: (err) => {
        this.nfcMessage = { type: 'error', payload: 'Error al canjear recompensa: ' + (err.error?.message || err.message) };
      }
    });
  }

  // --- Utilidades ---
  private resetState(): void {
    this.scannedNfcId = null;
    this.currentStudent = null;
    this.assignNfcForm.reset();
    this.giveTokensForm.reset({ monto: 0, descripcion: '' });
  }

  getEstudianteFullName(estudiante: Estudiante): string {
    return `${estudiante.nombre} ${estudiante.apellido}`;
  }
}