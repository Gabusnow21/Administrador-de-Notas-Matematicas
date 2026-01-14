import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';

import { GradoService, Grado } from '../../services/grado';
import { EstudianteService, Estudiante } from '../../services/estudiante';
import { AsistenciaService, Asistencia, EstadoAsistencia, AsistenciaRequest } from '../../services/asistencia.service';
import { WebNfcService } from '../../services/web-nfc.service';

interface AsistenciaViewModel {
  estudiante: Estudiante;
  asistencia?: Asistencia;
  isLoading?: boolean;
}

@Component({
  selector: 'app-gestion-asistencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gestion-asistencia.html',
  styleUrls: ['./gestion-asistencia.css']
})
export class GestionAsistenciaComponent implements OnInit, OnDestroy {
  private gradoService = inject(GradoService);
  private estudianteService = inject(EstudianteService);
  private asistenciaService = inject(AsistenciaService);
  private webNfcService = inject(WebNfcService);
  
  grados: Grado[] = [];
  selectedGradoId: number | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  
  studentsList: AsistenciaViewModel[] = [];
  isLoading = false;
  
  nfcSubscription?: Subscription;
  isNfcSupported = false;
  isScanning = false;
  nfcMessage: string | null = null;
  nfcMessageType: 'info' | 'success' | 'error' = 'info';

  estados = Object.values(EstadoAsistencia);

  ngOnInit() {
    this.checkNfcSupport();
    this.loadGrados();
    this.subscribeToNfc();
  }

  ngOnDestroy() {
    this.nfcSubscription?.unsubscribe();
  }

  checkNfcSupport() {
    this.isNfcSupported = 'NDEFReader' in window;
  }

  loadGrados() {
    this.gradoService.getGrados().subscribe(grados => this.grados = grados);
  }

  onGradoChange(event: any) {
    this.selectedGradoId = Number(event.target.value);
    this.loadData();
  }

  onDateChange(event: any) {
    this.selectedDate = event.target.value;
    this.loadData();
  }

  loadData() {
    if (!this.selectedGradoId) return;
    
    this.isLoading = true;
    this.studentsList = [];

    forkJoin({
      estudiantes: this.estudianteService.getEstudiantesPorGrado(this.selectedGradoId),
      asistencias: this.asistenciaService.getAsistenciaByGradoAndFecha(this.selectedGradoId, this.selectedDate)
    }).subscribe({
      next: ({ estudiantes, asistencias }) => {
        this.studentsList = estudiantes.map(est => {
          const asis = asistencias.find(a => a.estudiante.id === est.id);
          return {
            estudiante: est,
            asistencia: asis
          };
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  updateAsistencia(item: AsistenciaViewModel, estado: string) {
    if (!item.estudiante.id) return;
    
    item.isLoading = true;
    const request: AsistenciaRequest = {
      estudianteId: item.estudiante.id,
      fecha: this.selectedDate,
      estado: estado as EstadoAsistencia
    };

    this.asistenciaService.registrarAsistencia(request).subscribe({
      next: (asistencia) => {
        item.asistencia = asistencia;
        item.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        item.isLoading = false;
      }
    });
  }

  subscribeToNfc() {
    this.nfcSubscription = this.webNfcService.getMessages().subscribe(msg => {
      if (msg.type === 'data' && msg.payload?.serialNumber) {
        this.handleNfcScan(msg.payload.serialNumber);
      } else if (msg.type === 'error') {
         this.nfcMessage = msg.payload;
         this.nfcMessageType = 'error';
         this.isScanning = false;
      } else if (msg.type === 'info') {
         this.nfcMessage = msg.payload;
         this.nfcMessageType = 'info';
      } else if (msg.type === 'success') {
          // Ignore general success messages from service if we want custom message, 
          // or just show them.
      }
    });
  }

  startScan() {
    this.webNfcService.scan();
    this.isScanning = true;
    this.nfcMessage = 'Acerque tarjeta NFC...';
    this.nfcMessageType = 'info';
  }

  handleNfcScan(nfcId: string) {
    this.nfcMessage = 'Procesando...';
    this.nfcMessageType = 'info';

    this.asistenciaService.registrarAsistenciaPorNfc(nfcId).subscribe({
      next: (asistencia) => {
        this.nfcMessage = `Asistencia registrada: ${asistencia.estudiante.nombres} ${asistencia.estudiante.apellidos}`;
        this.nfcMessageType = 'success';
        
        // Update list if displayed and matches
        if (this.selectedGradoId && asistencia.estudiante.gradoId === this.selectedGradoId) {
             const item = this.studentsList.find(s => s.estudiante.id === asistencia.estudiante.id);
             if (item) {
               // Ensure the date matches the selected date before updating view
               // Since NFC defaults to today, if selectedDate is today, update it.
               const today = new Date().toISOString().split('T')[0];
               if (this.selectedDate === today) {
                   item.asistencia = asistencia;
               }
             }
        }
      },
      error: (err) => {
        this.nfcMessage = `Error: ${err.error?.message || 'No se pudo registrar'}`;
        this.nfcMessageType = 'error';
      }
    });
  }
}
