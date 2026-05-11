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
        // Si el directorio no existe, no es un error crítico para el usuario, 
        // simplemente vaciamos la lista de sugerencias.
        this.subDirectories = [];
      }
    });
  }

  selectDirectory(path: string) {
    this.configPath = path;
    this.explorePath(path);
  }

  goBack() {
    // Si la ruta está vacía o es la raíz, no hacemos nada
    if (!this.configPath || this.configPath === '/' || this.configPath === '.') {
      this.configPath = '/'; // Asegurar que mostramos algo válido
      this.explorePath(this.configPath);
      return;
    }
    
    // Quitar la última parte de la ruta
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
      // Primero asegurar que la ruta es la correcta en el servidor antes de subir
      this.loading = true;
      this.ticketService.setConfigPath(this.configPath).subscribe({
        next: () => {
          this.uploadAndSave();
        },
        error: (err) => {
          this.loading = false;
          alert('Error al establecer la ruta en el servidor: ' + (err.error?.message || err.message));
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
        alert(res.message || 'Archivos subidos correctamente.');
        this.selectedFiles = null;
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
      next: (res) => {
        this.loading = false;
        const msg = res.tokensGenerated !== undefined 
          ? `Configuración actualizada. Se encontraron ${res.tokensGenerated} boletas.` 
          : 'Configuración actualizada.';
        alert(msg);
        this.selectedFiles = null;
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
