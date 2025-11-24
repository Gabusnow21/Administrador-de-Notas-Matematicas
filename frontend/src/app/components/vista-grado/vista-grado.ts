import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EstudianteService, Estudiante } from '../../services/estudiante';

@Component({
  selector: 'app-vista-grado',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vista-grado.html',
  styleUrl: './vista-grado.css',
})

export class VistaGrado implements OnInit {
  private route = inject(ActivatedRoute)
  private estudianteService = inject(EstudianteService);
  private cdr = inject(ChangeDetectorRef);

  estudiantes: Estudiante[] = [];
  gradoId: number = 0;
  loading: boolean = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.gradoId = Number(params.get('id'));
      if (this.gradoId) {
        this.cargarEstudiantes();  
      }
    });
  }

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

}
