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
import { NfcInteractionService } from '../../services/nfc-interaction.service';
import { Reporte } from '../../services/reporte';
import { ToastService } from '../../services/toast.service';

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
  reporteService = inject(Reporte);
  webNfcService = inject(WebNfcService);
  nfcInteractionService = inject(NfcInteractionService);
  ngZone = inject(NgZone);
  private toast = inject(ToastService);

  grados: Grado[] = [];
  selectedGradoId: number | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  
  asistenciaList: AsistenciaViewModel[] = [];
  
  nfcMode = false;
  nfcLogs: string[] = [];
  private nfcSubscription?: Subscription;
  activeButton: { estudianteId: number; estado: EstadoAsistencia } | null = null;

  // Propiedades para la notificación
  notification: { show: boolean, message: string, studentName: string } = { show: false, message: '', studentName: '' };
  private notificationTimeout: any;

  estados = Object.values(EstadoAsistencia);
  EstadoAsistencia = EstadoAsistencia;

  // Propiedades para el reporte
  reportMonth: number = new Date().getMonth() + 1;
  reportYear: number = new Date().getFullYear();
  reporteGenerandose = false;
  months = [
    { value: 1, name: 'Enero' }, { value: 2, name: 'Febrero' }, { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' }, { value: 5, name: 'Mayo' }, { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' }, { value: 8, name: 'Agosto' }, { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' }, { value: 11, name: 'Noviembre' }, { value: 12, name: 'Diciembre' }
  ];

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
        estado: record ? record.estado : null,
        hora: record ? record.hora : null,
        loading: false
      };
    });
  }

  registrarManual(item: AsistenciaViewModel, estado: EstadoAsistencia) {
    item.loading = true;
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];

    this.asistenciaService.registrarAsistencia({
      estudianteId: item.estudiante.id,
      fecha: this.selectedDate,
      hora: timeString,
      estado: estado
    }).subscribe({
      next: (res) => {
        item.estado = res.estado;
        item.hora = res.hora;
        item.loading = false;
        this.activeButton = { estudianteId: item.estudiante.id!, estado: estado };
      },
      error: (err) => {
        console.error('Error registering attendance', err);
        item.loading = false;
        this.toast.error('Error al registrar asistencia');
      }
    });
  }

  generarReporteMensual() {
    if (!this.selectedGradoId) {
      this.toast.warning('Por favor, seleccione un grado.');
      return;
    }
    this.reporteGenerandose = true;
    this.reporteService.generarReporteAsistenciaMensual(this.selectedGradoId, this.reportMonth, this.reportYear)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ReporteAsistencia_${this.reportMonth}_${this.reportYear}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.reporteGenerandose = false;
        },
        error: (err) => {
          console.error('Error generando el reporte', err);
          this.toast.error('No se pudo generar el reporte de asistencia.');
          this.reporteGenerandose = false;
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
        
        const item = this.asistenciaList.find(i => i.estudiante.id === asistencia.estudiante.id);
        if (item) {
          item.estado = asistencia.estado;
          item.hora = asistencia.hora;
        }

        this.showNotification(`${asistencia.estudiante.nombres} ${asistencia.estudiante.apellidos}`, '+1 Asistencia Registrada');

        this.addLog(`Asignando 1 token de recompensa...`);
        this.nfcInteractionService.realizarTransaccion({
          nfcId: nfcId,
          monto: 1,
          descripcion: 'Recompensa por asistencia',
          tipo: 'ACUMULACION'
        }).subscribe({
          next: (estudianteConSaldoActualizado) => {
            this.addLog(`💰 RECOMPENSA! ${estudianteConSaldoActualizado.nombres} ha recibido 1 token.`);
            this.addLog(`Nuevo saldo: ${estudianteConSaldoActualizado.saldoTokens} tokens.`);
            
            if (item) {
                item.estudiante.saldoTokens = estudianteConSaldoActualizado.saldoTokens;
            }
          },
          error: (err) => {
            console.error('NFC Token Reward Error', err);
            this.addLog(`❌ Error al dar recompensa: ${err.error?.message || 'Error de servidor'}`);
          }
        });

      },
      error: (err) => {
        console.error('NFC Registration Error', err);
        this.addLog(`❌ Error: ${err.error?.message || 'Estudiante no encontrado o error de red'}`);
        this.toast.error('Error al registrar asistencia NFC');
      }
    });
  }

  showNotification(name: string, message: string) {
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    
    this.notification = {
      show: true,
      studentName: name,
      message: message
    };

    // Cerrar automáticamente después de 2 segundos (2000ms)
    this.notificationTimeout = setTimeout(() => {
      this.notification.show = false;
    }, 2000);
  }

  addLog(msg: string) {
    this.nfcLogs.unshift(`${new Date().toLocaleTimeString()} - ${msg}`);
    if (this.nfcLogs.length > 10) this.nfcLogs.pop();
  }
}
