import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Materia, MateriaService } from '../../services/materia';
import { AuthService } from '../../services/auth';
import { SyncService } from '../../services/sync';

export interface MateriaData {
  id?: number;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-gestion-materias',
  imports: [RouterLink, FormsModule],
  templateUrl: './gestion-materias.html',
  styleUrl: './gestion-materias.css',
})
export class GestionMaterias implements OnInit {
  private materiaService = inject(MateriaService);
  private authService = inject(AuthService);
  public syncService = inject(SyncService);

  materias: Materia[] = [];
  loading: boolean = true;
  procesando: boolean = false;

  // Estado del formulario
  esEdicion: boolean = false;
  materiaForm: MateriaData = { nombre: '', descripcion: '' };

  ngOnInit() {
    this.cargarMaterias();
  }

  cargarMaterias() {
    this.loading = true;
    this.materiaService.getAll().subscribe({
      next: (data) => {
        this.materias = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // Preparar formulario para editar
  editar(materia: Materia) {
    this.esEdicion = true;
    // Copiamos el objeto para no editar la tabla en vivo
    this.materiaForm = { ...materia };
  }

  // Limpiar formulario
  cancelarEdicion() {
    this.esEdicion = false;
    this.materiaForm = { nombre: '', descripcion: '' };
  }
  // Guardar cambios (crear o actualizar)
  guardar() {
    this.procesando = true;

    if (this.esEdicion) {
      this.materiaService.actualizar(this.materiaForm as Materia).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => { this.procesando = false; alert('Error al actualizar'); }
      });
    } else {
      this.materiaService.crear(this.materiaForm as Materia).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => { this.procesando = false; alert('Error al crear'); }
      });
    }
  }
  // Eliminar materia
  eliminar(materia: Materia) { 
    if(!confirm('¿Eliminar esta materia?')) return;
  
    const idParaBorrar = materia.id || materia.localId;

    if (idParaBorrar) {
        this.materiaService.borrar(idParaBorrar).subscribe({
          next: () => this.cargarMaterias(),
          error: () => alert('No se pudo eliminar offline.')
        });
    }
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
  }

  private finalizarOperacion() {
    this.procesando = false;
    this.cancelarEdicion();
    this.cargarMaterias();
  }

  logout() {
    this.authService.logout();
  }

}
