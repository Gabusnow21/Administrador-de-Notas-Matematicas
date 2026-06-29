import { Component, inject, OnInit } from '@angular/core';
import { Usuario, UsuarioService } from '../../services/usuario';
import { Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SyncService } from '../../services/sync';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast.service';


@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})

export class GestionUsuarios implements OnInit {
  public syncService = inject(SyncService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private toast = inject(ToastService);

  usuarios: Usuario[] = [];
  loading: boolean = true;
  procesando: boolean = false; // Para el spinner del botón guardar
  mostrarFormulario: boolean = false; // Toggle para mostrar/ocultar
  esEdicion: boolean = false; // Indica si el formulario está en modo edición

  // Objeto para el formulario (Por defecto Rol PROFESOR)
  nuevoUsuario: Usuario = {
    nombre: '',
    apellido: '',
    username: '',
    password: '',
    role: 'USER' 
  };

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usuarioService.getAll().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.loading = false;
      },
      error: (e) => { console.error(e); this.loading = false; }
    });
  }

  guardar() {
    this.procesando = true;

    if (this.esEdicion) {
      // MODO EDICIÓN
      this.usuarioService.actualizar(this.nuevoUsuario).subscribe({
        next: () => {
          this.toast.success('Usuario actualizado');
          this.finalizarOperacion();
        },
        error: () => { this.procesando = false; this.toast.error('Error al actualizar'); }
      });
    } else {
      this.usuarioService.crear(this.nuevoUsuario).subscribe({
        next: () => {
          this.toast.success('Usuario creado');
          this.finalizarOperacion();
        },
        error: () => { this.procesando = false; this.toast.error('Error al crear'); }
      });
    }
  }

  eliminar(id: number) {
    if(!confirm('¿Estás seguro de eliminar este usuario?')) return;

    this.usuarioService.borrar(this.usuarios.find(u => u.id === id)!).subscribe({
      next: () => {
        this.toast.success('Usuario eliminado');
        this.cargarUsuarios();
      }
    });
  }

  // Al editar
  editar(usuario: Usuario) {
    this.mostrarFormulario = true;
    this.esEdicion = true;
    // Copiamos datos, pero limpiamos password para no enviarla hasheada
    this.nuevoUsuario = { ...usuario, password: '' }; 
  }

  cancelar() {
    this.mostrarFormulario = false;
    this.esEdicion = false;
    this.nuevoUsuario = { nombre: '', apellido: '', username: '', password: '', role: 'USER' };
  }

  limpiarFormulario() {
    this.nuevoUsuario = { 
      nombre: '', apellido: '', username: '', password: '', role: 'USER' 
    };
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
  }

  private finalizarOperacion() {
    this.procesando = false;
    this.cancelar();
    this.cargarUsuarios();
  }

  logout() {
    this.authService.logout();
  }

}
