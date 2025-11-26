import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EstudianteService, Estudiante } from '../../services/estudiante';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vista-grado',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './vista-grado.html',
  styleUrl: './vista-grado.css',
})

export class VistaGrado implements OnInit {

  //Inyecciones de servicios
  private route = inject(ActivatedRoute)
  private estudianteService = inject(EstudianteService);
  private cdr = inject(ChangeDetectorRef);

  //Variables
  estudiantes: Estudiante[] = [];
  gradoId: number = 0;
  loading: boolean = true;

  mostrarFormulario: boolean = false;//Controla la visibilidad del formulario
  procesando: boolean = false;//Indicador de procesamiento del formulario
  UpdateEdicion: boolean = false;//Controla si se está en modo edición

  //Modelo para el nuevo estudiante
  nuevoEstudiante: any = {
    id: null,
    nombre: '',
    apellido: '',
    gradoId: 0 
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.gradoId = Number(params.get('id'));
      if (this.gradoId) {
        this.nuevoEstudiante.gradoId = this.gradoId; // Asignar el gradoId al nuevo estudiante
        this.cargarEstudiantes(); // Cargar estudiantes del grado especificado 
      }
    });
  }

  //Cargar estudiantes del grado
  cargarEstudiantes() {
    this.estudianteService.getEstudiantesPorGrado(this.gradoId).subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar estudiantes:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ... ngOnInit y cargarEstudiantes ...

  // 👇 NUEVA FUNCIÓN: Preparar formulario para editar
  editarEstudiante(est: Estudiante) {
    this.UpdateEdicion = true;
    this.mostrarFormulario = true;
    // Copiamos los datos para no editar la tabla en vivo
    this.nuevoEstudiante = { 
      id: est.id,
      nombre: est.nombre,
      apellido: est.apellido,
      gradoId: this.gradoId // Mantenemos el mismo grado
    };
  }

  // Eliminar estudiante
  eliminarEstudiante(est: Estudiante) {
    if (!confirm(`¿Eliminar a ${est.nombre} ${est.apellido}? Se borrarán sus notas.`)) return;

    this.estudianteService.deleteEstudiante(est.id).subscribe({
      next: () => {
        this.cargarEstudiantes(); // Recargar tabla
      },
      error: (err) => alert('Error al eliminar.')
    });
  }

  // Resetear formulario (para el botón "Inscribir")
  iniciarInscripcion() {
    this.UpdateEdicion = false;
    this.mostrarFormulario = !this.mostrarFormulario;
    this.nuevoEstudiante = {
      id: null,
      nombre: '',
      apellido: '',
      gradoId: this.gradoId
    };
  }

  //Guardar nuevo estudiante
  guardarEstudiante() {
    this.procesando = true;
    // Aseguramos que el ID del grado sea el correcto
    this.nuevoEstudiante.gradoId = this.gradoId;
    if (this.UpdateEdicion) {
      // MODO ACTUALIZAR
      this.estudianteService.updateEstudiante(this.nuevoEstudiante.id, this.nuevoEstudiante).subscribe({
        next: () => this.finalizarOperacion(),
        error: (err) => this.manejarError(err)
      });
    } else {
      // MODO CREAR
      this.estudianteService.createEstudiante(this.nuevoEstudiante).subscribe({
        next: () => this.finalizarOperacion(),
        error: (err) => this.manejarError(err)
      });
    }
  }

  // Helpers
  finalizarOperacion() {
    this.procesando = false;
    this.mostrarFormulario = false;
    this.cargarEstudiantes();
    this.iniciarInscripcion(); // Limpiar campos
  }

  manejarError(err: any) {
    console.error(err);
    this.procesando = false;
    alert('Ocurrió un error.');
  }

}
