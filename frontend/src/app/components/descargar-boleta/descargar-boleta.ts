import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth';

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

  studentListNumber: number | null = null;
  loading = false;
  message = '';
  error = '';

  // Configuración Admin
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
        console.error('Error al listar directorios:', err);
        this.subDirectories = [];
      }
    });
  }

  selectDirectory(path: string) {
    this.configPath = path;
    this.explorePath(path);
  }

  goBack() {
    if (!this.configPath || this.configPath === '/' || this.configPath === '.') return;
    
    const lastSlash = this.configPath.lastIndexOf('/');
    if (lastSlash > 0) {
      this.configPath = this.configPath.substring(0, lastSlash);
    } else if (lastSlash === 0) {
      this.configPath = '/';
    } else {
      this.configPath = '.';
    }
    this.explorePath(this.configPath);
  }

  onFolderSelected(event: any) {
    this.selectedFiles = event.target.files;
  }

  saveConfig() {
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      this.uploadAndSave();
    } else {
      this.updatePathOnly();
    }
  }

  private uploadAndSave() {
    this.loading = true;
    this.ticketService.uploadFiles(this.selectedFiles!).subscribe({
      next: () => {
        this.updatePathOnly();
      },
      error: (err) => {
        this.loading = false;
        alert('Error al subir archivos: ' + (err.error?.message || err.message));
      }
    });
  }

  private updatePathOnly() {
    this.loading = true;
    this.ticketService.setConfigPath(this.configPath).subscribe({
      next: () => {
        this.loading = false;
        alert('Configuración actualizada y boletas procesadas.');
        this.selectedFiles = null;
        this.ticketService.generateTickets().subscribe();
      },
      error: (err) => {
        this.loading = false;
        alert('Error: ' + (err.error?.message || 'No se pudo guardar la ruta.'));
      }
    });
  }

  onSubmit() {
    if (this.studentListNumber === null) {
      this.error = 'Por favor, ingresa tu número de lista.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.error = '';

    this.ticketService.validateTicket(this.studentListNumber).subscribe({
      next: (response) => {
        this.loading = false;
        this.message = 'Validación exitosa. Descargando boleta...';
        const url = this.ticketService.getDownloadUrl(response.token);
        
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `boleta_${this.studentListNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'No se pudo validar el número de lista. Asegúrate de que tu boleta esté disponible.';
      }
    });
  }
}
