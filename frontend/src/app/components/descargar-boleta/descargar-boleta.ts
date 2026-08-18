import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-descargar-boleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './descargar-boleta.html',
  styleUrls: ['./descargar-boleta.css']
})
export class DescargarBoleta implements OnInit {
  private ticketService = inject(TicketService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  nie: string = '';
  loading = false;
  message = '';
  error = '';
  nieAvailable = false;
  checkingNie = false;

  showAdmin = false;
  isAdmin = false;
  configPath = '';
  subDirectories: string[] = [];
  selectedFiles: FileList | null = null;

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    if (this.isAdmin) {
      this.loadCurrentPath();
    }
  }

  loadCurrentPath() {
    this.ticketService.getConfigPath().subscribe({
      next: (res) => {
        this.configPath = res.path;
        this.explorePath(this.configPath);
      }
    });
  }

  explorePath(path: string) {
    if (!path) return;
    this.ticketService.listDirectories(path).subscribe({
      next: (dirs) => {
        this.subDirectories = dirs;
        this.error = '';
      },
      error: (err) => {
        this.subDirectories = [];
      }
    });
  }

  selectDirectory(path: string) {
    this.configPath = path;
    this.explorePath(path);
  }

  goBack() {
    if (!this.configPath || this.configPath === '/' || this.configPath === '.') {
      this.configPath = '/';
      this.explorePath(this.configPath);
      return;
    }

    const parts = this.configPath.split('/').filter(p => p.length > 0);
    if (parts.length > 0) {
      parts.pop();
      this.configPath = '/' + parts.join('/');
      this.explorePath(this.configPath);
    } else {
      this.configPath = '/';
      this.explorePath(this.configPath);
    }
  }

  onFolderSelected(event: any) {
    this.selectedFiles = event.target.files;
  }

  saveConfig() {
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      this.loading = true;
      this.ticketService.setConfigPath(this.configPath).subscribe({
        next: () => {
          this.uploadAndSave();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error('Error al establecer la ruta en el servidor: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.updatePathOnly();
    }
  }

  private uploadAndSave() {
    this.ticketService.uploadFiles(this.selectedFiles!).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.success(res.message || 'Archivos subidos correctamente.');
        this.selectedFiles = null;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error('Error al subir archivos: ' + (err.error?.message || err.message));
      }
    });
  }

  private updatePathOnly() {
    this.loading = true;
    this.ticketService.setConfigPath(this.configPath).subscribe({
      next: (res) => {
        this.loading = false;
        const msg = res.tokensGenerated !== undefined
          ? `Configuración actualizada. Se encontraron ${res.tokensGenerated} boletas.`
          : 'Configuración actualizada.';
        this.toast.success(msg);
        this.selectedFiles = null;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error('Error: ' + (err.error?.message || 'No se pudo guardar la ruta.'));
      }
    });
  }

  onNieInput() {
    this.nieAvailable = false;
    this.message = '';
    this.error = '';

    if (this.nie.length === 8) {
      this.checkingNie = true;
      this.ticketService.checkNie(this.nie).subscribe({
        next: (res) => {
          this.checkingNie = false;
          this.nieAvailable = res.available;
        },
        error: (err) => {
          this.checkingNie = false;
          this.nieAvailable = false;
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

    this.loading = true;
    this.message = '';
    this.error = '';

    this.ticketService.validateTicket(this.nie).subscribe({
      next: (response) => {
        this.loading = false;
        this.message = 'Validación exitosa. Descargando boleta...';
        const url = this.ticketService.getDownloadUrl(response.token);

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `boleta_${this.nie}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se encontró una boleta disponible para este NIE.';
      }
    });
  }
}
