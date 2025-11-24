import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Calificacion, CalificacionService } from '../../services/calificacion';
import { EstudianteService } from '../../services/estudiante';
import { PercentPipe } from '@angular/common';

@Component({
  selector: 'app-vista-calificaciones',
  imports: [RouterLink, PercentPipe],
  standalone: true,
  templateUrl: './vista-calificaciones.html',
  styleUrl: './vista-calificaciones.css',
})
export class VistaCalificaciones implements OnInit {
  private route = inject(ActivatedRoute);
  private calificacionService = inject(CalificacionService);
  private estudianteService = inject(EstudianteService);
  private cd = inject(ChangeDetectorRef); // 🛡️ Estrategia segura

  estudianteId: number = 0;
  nombreEstudiante: string = 'Cargando...';
  calificaciones: Calificacion[] = [];
  loading: boolean = true;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.estudianteId = Number(params.get('id'));
      if (this.estudianteId) {
        this.cargarDatos();
      }
    });
  }

  cargarDatos() {
    // 1. Obtener Nombre del Estudiante (Opcional, si falla no rompe la app)
    this.estudianteService.getEstudianteById(this.estudianteId).subscribe({
      next: (est) => {
        this.nombreEstudiante = `${est.nombre} ${est.apellido}`;
        this.cd.detectChanges();
      },
      error: () => {
        this.nombreEstudiante = 'Estudiante #' + this.estudianteId;
        this.cd.detectChanges();
      }
    });

    // 2. Obtener Calificaciones
    this.calificacionService.getCalificacionesPorEstudiante(this.estudianteId).subscribe({
      next: (data) => {
        this.calificaciones = data;
        this.loading = false;
        this.cd.detectChanges(); // 🛡️ Forzar actualización
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

}
