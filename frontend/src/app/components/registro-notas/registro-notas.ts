import { Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalificacionService, PlanillaItem, CalificacionRequest } from '../../services/calificacion';
import { Grado, GradoService } from '../../services/grado';
import { Actividad,ActividadService } from '../../services/actividad';
import { Materia, MateriaService } from '../../services/materia';
import { Trimestre, TrimestreService } from '../../services/trimestre';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro-notas',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro-notas.html',
  styleUrl: './registro-notas.css',
})

export class RegistroNotas implements OnInit {
  // Inyecciones
  private gradoService = inject(GradoService);
  private materiaService = inject(MateriaService);
  private trimestreService = inject(TrimestreService);
  private actividadService = inject(ActividadService);
  private calificacionService = inject(CalificacionService);
  private route = inject(ActivatedRoute);

  // Catálogos
  grados: Grado[] = [];
  materias: Materia[] = [];
  trimestres: Trimestre[] = [];
  actividades: Actividad[] = [];

  // Selecciones
  selGrado: number = 0;
  selMateria: number = 0;
  selTrimestre: number = 0;
  selActividad: number = 0;

  // La Tabla de Datos
  planilla: PlanillaItem[] = [];
  loading: boolean = false;
  guardando: boolean = false;

  ngOnInit(): void {
    this.cargarCatalogos();
    this.route.queryParams.subscribe(params => {
      const paramId = params['gradoId'];
      const idNumerico = Number(paramId);
      
      // VALIDACIÓN ESTRICTA
      if (paramId && !isNaN(idNumerico) && idNumerico > 0) {
        this.selGrado = idNumerico;
        console.log('Grado pre-seleccionado:', this.selGrado);
      } else {
        this.selGrado = 0; // Si viene NaN, lo dejamos en 0 (Select vacío)
      }
    });
  }

  cargarCatalogos() {
    // 1. Cargar Grados
    this.gradoService.getGrados().subscribe({
      next: (d) => {
        this.grados = d;
      },
      error: (e) => console.error(e)
    });

    // 2. Cargar Materias
    this.materiaService.getAll().subscribe({
      next: (d) => {
        this.materias = d;
      },
      error: (e) => console.error(e)
    });

    // 3. Cargar Trimestres
    this.trimestreService.getAll().subscribe({
      next: (d) => {
        this.trimestres = d;
      },
      error: (e) => console.error(e)
    });
  }

  onFiltroChange() {
    this.actividades = [];
    this.planilla = []; // Limpiar tabla si cambian filtros
    this.selActividad = 0;

    if (this.selMateria && this.selTrimestre) {
      this.actividadService.getByMateriaAndTrimestre(this.selMateria, this.selTrimestre)
        .subscribe(data => this.actividades = data);
    }
  }

  cargarPlanilla() {
    if (!this.selGrado || !this.selActividad) return;

    this.loading = true;
    this.calificacionService.obtenerPlanilla(this.selGrado, this.selActividad)
      .subscribe({
        next: (data) => {
          this.planilla = data;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  // Marcar fila como modificada cuando el usuario escribe
  marcarCambio(item: PlanillaItem) {
    item.modificado = true;
  }

  guardarCambios() {
    this.guardando = true;
    
    // Filtramos solo los que se modificaron o tienen nota
    const aGuardar = this.planilla.filter(p => p.modificado && p.nota !== undefined && p.nota !== null);

    // Truco: Usamos Promesas para esperar que todos se guarden (o forkJoin si eres pro en RxJS)
    let procesados = 0;

    if (aGuardar.length === 0) {
      this.guardando = false;
      alert('No hay cambios para guardar');
      return;
    }

    aGuardar.forEach(item => {
      const request: CalificacionRequest = {
        estudianteId: item.estudianteId,
        actividadId: this.selActividad,
        nota: item.nota!,
        observacion: item.observacion || ''
      };

      this.calificacionService.guardarCalificacion(request).subscribe({
        next: () => {
          procesados++;
          item.modificado = false; // Limpiar flag
          if (procesados === aGuardar.length) {
            this.guardando = false;
            alert('¡Notas guardadas correctamente!');
          }
        },
        error: () => {
          procesados++; // Contamos aunque falle para no bloquear
          if (procesados === aGuardar.length) this.guardando = false;
        }
      });
    });
  }

}
