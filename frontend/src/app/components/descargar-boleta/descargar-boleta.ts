import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-descargar-boleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './descargar-boleta.html',
  styleUrls: ['./descargar-boleta.css']
})
export class DescargarBoleta {
  private ticketService = inject(TicketService);

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

    const url = this.ticketService.getDownloadUrl(this.nie);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `boleta_${this.nie}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      this.downloading = false;
    }, 3000);
  }
}
