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
  
  //Modelo para el nuevo estudiante
  nuevoEstudiante = {
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

  //Guardar nuevo estudiante
  guardarEstudiante() {
    this.procesando = true;
    // Aseguramos que el ID del grado sea el correcto
    this.nuevoEstudiante.gradoId = this.gradoId;

    this.estudianteService.createEstudiante(this.nuevoEstudiante).subscribe({
      next: (res) => {
        console.log('Estudiante inscrito:', res);
        this.procesando = false;
        this.mostrarFormulario = false; // Ocultar form
        
        // Limpiar campos
        this.nuevoEstudiante.nombre = '';
        this.nuevoEstudiante.apellido = '';
        
        // Recargar lista
        this.loading = true;
        this.cargarEstudiantes();
      },
      error: (err) => {
        console.error('Error inscribiendo:', err);
        alert('Error al inscribir estudiante.');
        this.procesando = false;
      }
    });
  }
}
