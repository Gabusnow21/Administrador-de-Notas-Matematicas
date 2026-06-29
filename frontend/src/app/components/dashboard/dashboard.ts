import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Grado, GradoService } from '../../services/grado';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { SyncService } from '../../services/sync';
import { Usuario, UsuarioService } from '../../services/usuario';
import { CommonModule } from '@angular/common';

declare var bootstrap: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ RouterLink, FormsModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private gradoService = inject(GradoService);
  private usuarioService = inject(UsuarioService);
  public syncService = inject(SyncService);

  grados: Grado[] = [];
  profesores: Usuario[] = [];
  loading: boolean = true;
  procesando: boolean = false;
  updateEdicion: boolean = false;

  nuevoGrado: any = {
    id: null,
    nivel: '',
    seccion: '',
    anioEscolar: new Date().getFullYear(),
    profesorId: null
  };

  @ViewChild('modalGrado') private modalElement!: ElementRef;
  private modalInstance: any;

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isTeacher(): boolean {
    return this.authService.isTeacher();
  }

  get userName(): string {
    return this.authService.getUserName();
  }

  ngOnInit(): void {
    this.cargarGrados();
    if (this.isAdmin) {
      this.cargarProfesores();
    }
  }

  ngAfterViewInit(): void {
    if (this.modalElement) {
      this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
    }
  }

  cargarProfesores() {
    this.usuarioService.getTeachers().subscribe({
      next: (data) => this.profesores = data,
      error: (err) => console.error('Error cargando profesores', err)
    });
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
  }

  editarGrado(grado: Grado) {
    this.updateEdicion = true;
    this.nuevoGrado = { 
      ...grado,
      profesorId: grado.profesor ? grado.profesor.id : null
    };
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  iniciarCreacion() {
    this.updateEdicion = false;
    this.nuevoGrado = {
      id: null,
      nivel: '',
      seccion: '',
      anioEscolar: new Date().getFullYear(),
      profesorId: null
    };
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  cargarGrados() {
    this.gradoService.getGrados().subscribe({
      next: (data) => {
        this.grados = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  guardarGrado() {
    this.procesando = true;

    // Convertir profesorId a objeto profesor para el backend
    const gradoData = { ...this.nuevoGrado };
    if (gradoData.profesorId) {
      gradoData.profesor = { id: gradoData.profesorId };
    } else {
      gradoData.profesor = null;
    }
    delete gradoData.profesorId;

    if (this.updateEdicion) {
      this.gradoService.actualizarGrado(gradoData).subscribe({
        next: () => this.finalizarOperacion('Grado actualizado correctamente'),
        error: (err) => this.manejarError(err)
      });
    } else {
      this.gradoService.crearGrado(gradoData).subscribe({
        next: () => this.finalizarOperacion('Grado creado correctamente'),
        error: (err) => this.manejarError(err)
      });
    }
  }

  eliminarGrado(grado: Grado) {
    const confirmacion = confirm(`¿Estás seguro de eliminar el ${grado.nivel}?`);
    if (!confirmacion) return;

    this.gradoService.deleteGrado(grado).subscribe({
      next: () => this.cargarGrados(),
      error: (err) => {
        console.error(err);
        alert('No se pudo eliminar el grado.');
      }
    });
  }

  finalizarOperacion(mensaje: string) {
    console.log(mensaje);
    this.procesando = false;
    this.cargarGrados();
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  manejarError(err: any) {
    console.error(err);
    alert('Ocurrió un error. Revisa la consola.');
    this.procesando = false;
  }

  logout() {
    this.authService.logout();
  }
}
