import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradoService, Grado } from '../../services/grado';
import { EstudianteService } from '../../services/estudiante';
import { Estudiante } from '../../services/estudiante';
import { AsistenciaService } from '../../services/asistencia.service';
import { Asistencia, EstadoAsistencia } from '../../services/asistencia';
import { WebNfcService, NfcMessage } from '../../services/web-nfc.service';
import { Subscription } from 'rxjs';

interface AsistenciaViewModel {
  estudiante: Estudiante;
  estado: EstadoAsistencia | null;
  hora: string | null;
  loading: boolean;
}

@Component({
  selector: 'app-gestion-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-asistencia.html',
  styleUrls: ['./gestion-asistencia.css']
})
export class GestionAsistenciaComponent implements OnInit, OnDestroy {
  gradoService = inject(GradoService);
  estudianteService = inject(EstudianteService);
  asistenciaService = inject(AsistenciaService);
  webNfcService = inject(WebNfcService);
  ngZone = inject(NgZone);

  grados: Grado[] = [];
  selectedGradoId: number | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  
  asistenciaList: AsistenciaViewModel[] = [];
  
  nfcMode = false;
  nfcLogs: string[] = [];
  private nfcSubscription?: Subscription;

  estados = Object.values(EstadoAsistencia);
  EstadoAsistencia = EstadoAsistencia;

  ngOnInit() {
    this.gradoService.getGrados().subscribe(grados => {
      this.grados = grados;
    });

    this.nfcSubscription = this.webNfcService.getMessages().subscribe(msg => {
      if (this.nfcMode && msg.type === 'data' && msg.payload.serialNumber) {
        this.handleNfcScan(msg.payload.serialNumber);
      }
    });
  }

  ngOnDestroy() {
    this.nfcSubscription?.unsubscribe();
  }

  loadData() {
    if (!this.selectedGradoId) return;

    // Load students and attendance in parallel (simple forkJoin or just separate subscribes)
    // For simplicity, let's load students first, then attendance to merge.
    
    this.estudianteService.getEstudiantesPorGrado(this.selectedGradoId).subscribe(estudiantes => {
      this.asistenciaService.getAsistenciaPorGrado(this.selectedGradoId!, this.selectedDate).subscribe(asistencias => {
        this.mergeData(estudiantes, asistencias);
      });
    });
  }

  mergeData(estudiantes: Estudiante[], asistencias: Asistencia[]) {
    this.asistenciaList = estudiantes.map(est => {
      const record = asistencias.find(a => a.estudiante.id === est.id);
      return {
        estudiante: est,
        estado: record ? record.estado : null, // Default to null (not taken)
        hora: record ? record.hora : null,
        loading: false
      };
    });
  }

  registrarManual(item: AsistenciaViewModel, estado: EstadoAsistencia) {
    item.loading = true;
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS

    this.asistenciaService.registrarAsistencia({
      estudianteId: item.estudiante.id,
      fecha: this.selectedDate,
      hora: timeString, // Use current time or existing time? For manual, use current time if setting new status
      estado: estado
    }).subscribe({
      next: (res) => {
        item.estado = res.estado;
        item.hora = res.hora;
        item.loading = false;
      },
      error: (err) => {
        console.error('Error registering attendance', err);
        item.loading = false;
        alert('Error al registrar asistencia');
      }
    });
  }

  toggleNfcMode() {
    this.nfcMode = !this.nfcMode;
    if (this.nfcMode) {
      this.webNfcService.scan();
      this.addLog('Modo NFC activado. Acerque tarjetas...');
    } else {
      this.addLog('Modo NFC desactivado.');
    }
  }

  handleNfcScan(nfcId: string) {
    this.addLog(`Tag detectado: ${nfcId}... buscando estudiante`);
    
    // We call register directly. The backend will look up the student by NFC ID.
    // However, for the UI list update, we need to know WHICH student it was.
    // The backend returns the Asistencia object which contains the Estudiante.
    
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];

    this.asistenciaService.registrarAsistencia({
      nfcId: nfcId,
      fecha: this.selectedDate,
      hora: timeString,
      estado: EstadoAsistencia.PRESENTE
    }).subscribe({
      next: (asistencia) => {
        this.addLog(`✅ Asistencia registrada: ${asistencia.estudiante.nombres} ${asistencia.estudiante.apellidos}`);
        
        // Update the list if the student is in the current view
        const item = this.asistenciaList.find(i => i.estudiante.id === asistencia.estudiante.id);
        if (item) {
          item.estado = asistencia.estado;
          item.hora = asistencia.hora;
        }
      },
      error: (err) => {
        console.error('NFC Registration Error', err);
        this.addLog(`❌ Error: ${err.error?.message || 'Estudiante no encontrado o error de red'}`);
      }
    });
  }

  addLog(msg: string) {
    this.nfcLogs.unshift(`${new Date().toLocaleTimeString()} - ${msg}`);
    if (this.nfcLogs.length > 10) this.nfcLogs.pop();
  }
}
