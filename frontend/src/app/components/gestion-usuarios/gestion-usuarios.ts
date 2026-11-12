import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Usuario, UsuarioDesactivado, UsuarioService } from '../../services/usuario';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SyncService } from '../../services/sync';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast.service';


@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})

export class GestionUsuarios implements OnInit {
  public syncService = inject(SyncService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private toast = inject(ToastService);

  usuarios: Usuario[] = [];
  usuariosInactivos: UsuarioDesactivado[] = [];
  loading: boolean = true;
  cargandoInactivos: boolean = false;
  restaurandoId: number | null = null;
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
    this.cargarInactivos();
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

  cargarInactivos() {
    this.cargandoInactivos = true;
    this.usuarioService.getInactivos().subscribe({
      next: (data) => {
        this.usuariosInactivos = data;
        this.cargandoInactivos = false;
      },
      error: (e) => {
        console.error(e);
        this.cargandoInactivos = false;
      }
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
    const usuario = this.usuarios.find(u => u.id === id);
    if (!usuario) return;

    if (!confirm(`¿Desactivar a ${usuario.nombre} ${usuario.apellido}? Conservará su historial y podrá restaurarse después.`)) return;

    this.usuarioService.borrar(usuario).subscribe({
      next: () => {
        this.toast.success('Usuario desactivado');
        this.cargarUsuarios();
        this.cargarInactivos();
      },
      error: (err) => {
        this.toast.error(this.mensajeError(err, 'No se pudo desactivar el usuario.'));
      }
    });
  }

  restaurar(usuario: UsuarioDesactivado) {
    if (!navigator.onLine) {
      this.toast.warning('Necesitas conexión para restaurar al usuario.');
      return;
    }

    const nombre = `${usuario.nombre} ${usuario.apellido}`;
    if (!confirm(`¿Restaurar a ${nombre}? Podrá volver a iniciar sesión.`)) return;

    this.restaurandoId = usuario.id;
    this.usuarioService.restaurar(usuario.id).subscribe({
      next: () => {
        this.restaurandoId = null;
        this.toast.success('Usuario restaurado');
        this.cargarUsuarios();
        this.cargarInactivos();
      },
      error: (err) => {
        this.restaurandoId = null;
        this.toast.error(this.mensajeError(err, 'No se pudo restaurar el usuario.'));
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

  private mensajeError(err: any, porDefecto: string): string {
    return err?.error?.message || err?.error?.detail || porDefecto;
  }

}
