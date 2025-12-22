import { Component, inject, OnInit } from '@angular/core';
import { Usuario, UsuarioService } from '../../services/usuario';
import { RouterLink, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SyncService } from '../../services/sync';
import { AuthService } from '../../services/auth';


@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})

export class GestionUsuarios implements OnInit {
  public syncService = inject(SyncService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);

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
          this.finalizarOperacion('Usuario actualizado');
        },
        error: () => { this.procesando = false; alert('Error al actualizar'); }
      });
    } else {
      // MODO CREACIÓN
      this.usuarioService.crear(this.nuevoUsuario).subscribe({
        next: () => {
          this.finalizarOperacion('Usuario creado');
        },
        error: () => { this.procesando = false; alert('Error al crear'); }
      });
    }
  }

  eliminar(id: number) {
    if(!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    this.usuarioService.borrar(this.usuarios.find(u => u.id === id)!).subscribe(() => this.cargarUsuarios());
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

    private finalizarOperacion(msg: string) {
    this.procesando = false;
    alert(msg);
    this.cancelar();
    this.cargarUsuarios();
  }

  logout() {
    this.authService.logout();
  }

}
