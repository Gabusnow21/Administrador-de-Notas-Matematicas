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
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, AfterViewInit {
  public authService = inject(AuthService);
  private gradoService = inject(GradoService);
  public syncService = inject(SyncService);
  private usuarioService = inject(UsuarioService);

  grados: Grado[] = [];
  loading: boolean = true;
  procesando: boolean = false;
  updateEdicion: boolean = false;
  profesores: Usuario[] = [];

  nuevoGrado: any = {
    id: null,
    nivel: '',
    seccion: '',
    anioEscolar: new Date().getFullYear(),
    profesor: null
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
    console.log('Dashboard Init. Role:', this.authService.getRole(), 'IsAdmin:', this.isAdmin);
    this.cargarGrados();
    if (this.isAdmin) {
      console.log('Es Admin. Cargando profesores...');
      this.cargarProfesores();
    } else {
        console.log('No es Admin. No se cargan profesores.');
    }
  }

  compareProfesores(o1: Usuario, o2: Usuario): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }

  ngAfterViewInit(): void {
    if (this.modalElement) {
      this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
    }
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
  }

  cargarProfesores() {
    this.usuarioService.getAll().subscribe({
      next: (users) => {
        // Filtramos solo los usuarios con rol TEACHER o USER (para retrocompatibilidad)
        this.profesores = users.filter(u => u.role === 'TEACHER' || u.role === 'USER');
        console.log('Profesores cargados:', this.profesores.length);
      },
      error: (err) => console.error('Error al cargar profesores', err)
    });
  }

  editarGrado(grado: Grado) {
    this.updateEdicion = true;
    this.nuevoGrado = { ...grado };
    // Aseguramos que el objeto profesor esté correctamente asignado para el select
    // (Angular compara por referencia, así que podría necesitarse un ajuste si viene de otro lado,
    // pero usualmente si 'grado.profesor' viene lleno, funcionará si la referencia coincide o si usamos [ngValue])
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
      profesor: null
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

    // Make sure the 'profesor' is a full object if selected
    if (this.isAdmin && this.nuevoGrado.profesor && this.nuevoGrado.profesor.id) {
      this.nuevoGrado.profesor = this.profesores.find(p => p.id === this.nuevoGrado.profesor.id);
    }

    if (this.updateEdicion) {
      this.gradoService.actualizarGrado(this.nuevoGrado).subscribe({
        next: () => this.finalizarOperacion('Grado actualizado correctamente'),
        error: (err) => this.manejarError(err)
      });
    } else {
      this.gradoService.crearGrado(this.nuevoGrado).subscribe({
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
