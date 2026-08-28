import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { Reporte } from '../../services/reporte';

@Component({
  selector: 'app-descargar-boleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './descargar-boleta.html',
  styleUrls: ['./descargar-boleta.css']
})
export class DescargarBoleta {
  private ticketService = inject(TicketService);
  private reporteService = inject(Reporte);

  nie: string = '';
  downloading = false;
  error = '';
  nombreEstudiante: string = '';
  nieAvailable = false;
  checkingNie = false;

  onNieInput() {
    this.nieAvailable = false;
    this.nombreEstudiante = '';
    this.error = '';

    if (this.nie.length === 8) {
      this.checkingNie = true;
      this.ticketService.checkNie(this.nie).subscribe({
        next: (res) => {
          this.checkingNie = false;
          this.nieAvailable = res.available;
          this.nombreEstudiante = res.nombre || '';
        },
        error: (err) => {
          this.checkingNie = false;
          this.nieAvailable = false;
          this.nombreEstudiante = '';
        }
      });
    }
  }

  isNieValid(): boolean {
    return /^\d{8}$/.test(this.nie);
  }

  onSubmit() {
    if (!this.isNieValid()) {
      this.error = 'El NIE debe tener exactamente 8 dígitos.';
      return;
    }

    this.downloading = true;
    this.error = '';

    // Flujo completo del frontend: el backend entrega los datos por NIE
    // y el PDF (notas + conducta) se genera localmente con jsPDF.
    this.ticketService.getBoletaData(this.nie).subscribe({
      next: (datos) => {
        try {
          const blob = this.reporteService.generarPdfDesdeDatos(datos);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `boleta_${this.nie}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          this.downloading = false;
        } catch {
          this.downloading = false;
          this.error = 'No se pudo generar la boleta. Intenta de nuevo.';
        }
      },
      error: (err) => {
        this.downloading = false;
        if (err?.status === 404) {
          this.error = 'No hay boleta disponible para este NIE.';
        } else if (err?.status === 429) {
          this.error = 'Demasiadas solicitudes. Intenta de nuevo en un minuto.';
        } else {
          this.error = 'Error al obtener los datos de la boleta. Verifica tu conexión.';
        }
      }
    });
  }
}
