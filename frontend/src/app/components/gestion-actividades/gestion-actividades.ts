import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Materia } from '../../services/materia';
import { Trimestre } from '../../services/trimestre';
import { Actividad } from '../../services/actividad';

@Component({
  selector: 'app-gestion-actividades',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './gestion-actividades.html',
  styleUrl: './gestion-actividades.css',
})
export class GestionActividades implements OnInit {
  private materiaService = inject(Materia);
  private trimestreService = inject(Trimestre);
  private actividadService = inject(Actividad);

  // Catálogos
  materias: Materia[] = [];
  trimestres: Trimestre[] = [];
  actividades: Actividad[] = [];

  // Selecciones de Filtro
  selMateria: number = 0;
  selTrimestre: number = 0;

  // Estado Formulario
  esEdicion: boolean = false;
  procesando: boolean = false;
  
  // Objeto para el formulario
  actividadForm: Partial<Actividad> = {
    nombre: '',
    descripcion: '',
    porcentaje: 0,
    materiaId: 0,
    trimestreId: 0
  };

  ngOnInit() {
    this.cargarCatalogos();
  }

  cargarCatalogos() {
    this.materiaService.getAll().subscribe(d => this.materias = d);
    this.trimestreService.getAll().subscribe(d => this.trimestres = d);
  }

  // Cargar lista cuando cambian los filtros
  cargarActividades() {
    if (this.selMateria && this.selTrimestre) {
      this.actividadService.getByMateriaAndTrimestre(this.selMateria, this.selTrimestre)
        .subscribe(data => this.actividades = data);
    } else {
      this.actividades = [];
    }
    this.cancelarEdicion(); // Resetear formulario al cambiar de vista
  }

  guardar() {
    this.procesando = true;

    // Asignamos las relaciones (Backend espera objetos con ID)
    this.actividadForm.materiaId = this.selMateria;
    this.actividadForm.trimestreId = this.selTrimestre;

    if (this.esEdicion) {
      this.actividadService.actualizar(this.actividadForm as Actividad).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => { this.procesando = false; alert('Error al actualizar'); }
      });
    } else {
      this.actividadService.crear(this.actividadForm as Actividad).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => { this.procesando = false; alert('Error al crear'); }
      });
    }
  }

  editar(act: Actividad) {
    this.esEdicion = true;
    this.actividadForm = { ...act };
  }

  eliminar(id: number) {
    if(!confirm('¿Eliminar actividad? Se borrarán las notas asociadas.')) return;
    this.actividadService.borrar(id).subscribe(() => this.cargarActividades());
  }

  cancelarEdicion() {
    this.esEdicion = false;
    this.actividadForm = { nombre: '', descripcion: '', porcentaje: 0 };
  }

  private finalizarOperacion() {
    this.procesando = false;
    this.cancelarEdicion();
    this.cargarActividades();
  }

}
