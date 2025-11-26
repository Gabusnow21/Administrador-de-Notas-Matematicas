import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Calificacion, CalificacionRequest, CalificacionService } from '../../services/calificacion';
import { EstudianteService } from '../../services/estudiante';
import { PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reporte } from '../../services/reporte';

@Component({
  selector: 'app-vista-calificaciones',
  imports: [RouterLink, PercentPipe,FormsModule],
  standalone: true,
  templateUrl: './vista-calificaciones.html',
  styleUrl: './vista-calificaciones.css',
})
export class VistaCalificaciones implements OnInit {
  private route = inject(ActivatedRoute);
  private calificacionService = inject(CalificacionService);
  private estudianteService = inject(EstudianteService);
  private cd = inject(ChangeDetectorRef); // Estrategia segura para forzar actualización
  private reporteService = inject(Reporte);// Servicio de Reportes

  estudianteId: number = 0;
  nombreEstudiante: string = 'Cargando...';
  calificaciones: Calificacion[] = [];
  loading: boolean = true;
  descargando: boolean = false;//Spin de carga de boletín
  
  // Variable para botón de carga
  procesando: boolean = false;

  //Objeto para el formulario
  nuevaCalificacion: CalificacionRequest = {
    estudianteId: 0,
    actividadId: 0,
    nota: 0,
    observacion: ''
  };

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
  guardarNota() {
    this.procesando = true;
    // Asegurar que el ID del estudiante es correcto
    this.nuevaCalificacion.estudianteId = this.estudianteId;

    this.calificacionService.guardarCalificacion(this.nuevaCalificacion).subscribe({
      next: (res) => {
        console.log('Guardado:', res);
        this.procesando = false;
        
        // Limpiar campos (opcional)
        this.nuevaCalificacion.nota = 0;
        this.nuevaCalificacion.observacion = '';
        
        // Recargar la tabla para ver el cambio
        this.cargarDatos(); 
      },
      error: (err) => {
        console.error('Error guardando:', err);
        alert('Error al guardar. Verifica que el ID de Actividad exista.');
        this.procesando = false;
        this.cd.detectChanges();
      }
    });
  }

  // Método para descargar el boletín en PDF
  descargarPDF() {
    this.descargando = true;
    this.reporteService.descargarBoletin(this.estudianteId).subscribe({
      next: (blob: Blob) => {
        // Crear una URL temporal para el archivo
        const url = window.URL.createObjectURL(blob);
        
        // Crear un link invisible y darle clic automáticamente
        const a = document.createElement('a');
        a.href = url;
        a.download = `Boletin_${this.nombreEstudiante}.pdf`; // Nombre del archivo
        document.body.appendChild(a);
        a.click();
        
        // Limpieza
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.descargando = false;
        this.cd.detectChanges(); // Refrescar vista (quitar spinner)
      },
      error: (err) => {
        console.error('Error descargando PDF', err);
        alert('No se pudo generar el reporte.');
        this.descargando = false;
        this.cd.detectChanges();
      }
    });
  }

}
