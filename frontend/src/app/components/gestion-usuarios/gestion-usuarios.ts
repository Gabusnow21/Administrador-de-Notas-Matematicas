import { Component, inject, OnInit } from '@angular/core';
import { Usuario, usuarioService } from '../../services/usuario';
import { RouterLink, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})

export class GestionUsuarios implements OnInit {

  private usuarioService = inject(usuarioService);

  usuarios: Usuario[] = [];
  loading: boolean = true;
  procesando: boolean = false; // Para el spinner del botón guardar
  mostrarFormulario: boolean = false; // Toggle para mostrar/ocultar

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
    this.usuarioService.crear(this.nuevoUsuario).subscribe({
      next: () => {
        alert('Usuario creado correctamente');
        this.procesando = false;
        this.mostrarFormulario = false;
        this.limpiarFormulario();
        this.cargarUsuarios(); // Recargar la tabla
      },
      error: (err) => {
        console.error(err);
        this.procesando = false;
        alert('Error al crear usuario. Verifica que el correo no esté repetido.');
      }
    });
  }

  eliminar(id: number) {
    if(!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    this.usuarioService.borrar(id).subscribe(() => this.cargarUsuarios());
  }

  limpiarFormulario() {
    this.nuevoUsuario = { 
      nombre: '', apellido: '', username: '', password: '', role: 'USER' 
    };
  }

}
