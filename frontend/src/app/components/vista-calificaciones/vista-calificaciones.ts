import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Calificacion, CalificacionRequest, CalificacionService } from '../../services/calificacion';
import { EstudianteService } from '../../services/estudiante';
import { PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reporte } from '../../services/reporte';
import { Materia, MateriaService } from '../../services/materia';
import { Actividad, ActividadService } from '../../services/actividad';
import { Trimestre, TrimestreService } from '../../services/trimestre';
import { SyncService } from '../../services/sync';
import { AuthService } from '../../services/auth';

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
  private reporteService = inject(Reporte);// Servicio de Reportes
  private materiaService = inject(MateriaService);
  private actividadService = inject(ActividadService);
  private trimestreService = inject(TrimestreService);
  public syncService = inject(SyncService);
  private authService = inject(AuthService);


  //Variables
  estudianteId: number = 0;
  nombreEstudiante: string = 'Cargando...';
  calificaciones: Calificacion[] = [];
  loading: boolean = true;
  descargando: boolean = false;//Spin de carga de boletín
  materias: Materia[] = [];
  actividades: Actividad[] = [];
  trimestres: Trimestre[] = [];

  materiaIDSeleccionada: number = 0;
  trimestreIDSeleccionado: number = 0;

  // Variable para botón de carga
  procesando: boolean = false;
  showModal: boolean = false; // Visibilidad del modal

  get isOnline(): boolean { return this.syncService.isOnline(); }

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
    this.cargarCatalogos();
  }
      // METODOS
  // Método para cargar datos iniciales
  cargarDatos() {
    // 1. Obtener Nombre del Estudiante (Opcional, si falla no rompe la app)
    this.estudianteService.getEstudianteById(this.estudianteId).subscribe({
      next: (est) => {
        this.nombreEstudiante = `${est.nombres} ${est.apellidos}`;
      },
      error: () => {
        this.nombreEstudiante = 'Estudiante #' + this.estudianteId;
      }
    });

    // 2. Obtener Calificaciones
    this.calificacionService.getCalificacionesPorEstudiante(this.estudianteId).subscribe({
      next: (data) => {
        this.calificaciones = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
  // Método para guardar una nueva calificación
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
        this.cerrarModal(); // Cerrar modal al guardar con éxito
      },
      error: (err) => {
        console.error('Error guardando:', err);
        alert('Error al guardar. Verifica que el ID de Actividad exista.');
        this.procesando = false;
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
      },
      error: (err) => {
        console.error('Error descargando PDF', err);
        alert('No se pudo generar el reporte.');
        this.descargando = false;
      }
    });
  }
  // Método para cargar catálogos necesarios
  cargarCatalogos() {
    this.materiaService.getAll().subscribe(data => {
      this.materias = data;
    });
    
    this.trimestreService.getAll().subscribe(data => {
      this.trimestres = data;
    });
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
  }

  onFiltroChange() {
    this.actividades = []; // Limpiar anteriores
    this.nuevaCalificacion.actividadId = 0; // Resetear selección

    const mId = Number(this.materiaIDSeleccionada);
    const tId = Number(this.trimestreIDSeleccionado);

    if (this.isOnline) {
      if (mId > 0 && tId > 0) {
        this.actividadService.getByMateriaAndTrimestre(mId, tId)
          .subscribe({
            next: (data) => {
              this.actividades = data;
              console.log(`Actividades cargadas (Materia: ${mId}, Trimestre: ${tId}):`, data);

              if (data.length === 0) {
                console.warn('No se encontraron actividades para los filtros seleccionados');
              }
            },
            error: (err) => {
              console.error('Error cargando actividades:', err);
            }
          });
      }
    } else {
      // Si estamos offline, cargamos todas las actividades locales disponibles
      this.materiaIDSeleccionada = 0; // Resetear para que el dropdown no muestre un filtro activo
      this.trimestreIDSeleccionado = 0; // Resetear
      this.actividadService.getAllLocalActivities()
        .subscribe({
          next: (data) => {
            this.actividades = data;
            console.log('Actividades cargadas desde local (offline):', data);
            if (data.length === 0) {
              console.warn('No se encontraron actividades locales.');
            }
          },
          error: (err) => {
            console.error('Error cargando actividades locales:', err);
          }
        });
    }
  }

  // Método que se ejecuta cuando el usuario selecciona una actividad del dropdown
  onActividadSeleccionada() {
    if (this.nuevaCalificacion.actividadId > 0) {
      console.log('Actividad seleccionada:', this.nuevaCalificacion.actividadId);
      // Recargar calificaciones para actualizar la vista con los datos más recientes
      this.cargarDatos();
    }
  }

  abrirModal() {
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  logout() {
    this.authService.logout();
  }
}
