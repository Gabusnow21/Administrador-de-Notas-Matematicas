import { Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalificacionService, PlanillaItem, CalificacionRequest } from '../../services/calificacion';
import { Grado, GradoService } from '../../services/grado';
import { Actividad,ActividadService } from '../../services/actividad';
import { Materia, MateriaService } from '../../services/materia';
import { Trimestre, TrimestreService } from '../../services/trimestre';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SyncService } from '../../services/sync';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-registro-notas',
  standalone: true,
  imports: [FormsModule],
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
  public syncService = inject(SyncService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

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

  // --- Comportamiento (Conducta) ---
  modoConducta: boolean = false;
  itemsConducta: Actividad[] = [];
  planillaConducta: any[] = []; // { estudianteId, nombre, notas: { [actividadId]: nota } }

  // Aspectos estáticos de conducta (Extraídos de reporte.ts)
  descripcionesConducta: string[] = [
    'Coopera y participa en las distintas actividades del aula y Centro Escolar.',
    'Es respetuoso con todos los profesores, compañeros y demás personas.',
    'Presenta sus trabajos completos, en orden, limpios y en la fecha indicada.',
    'Es responsable y organizado en su trabajo.',
    'Tiene hábito de estudio.',
    'Ha mejorado su rendimiento escolar.',
    'Tiene ausencia sin justificación escrita.',
    'Se presenta al Centro Escolar con uniforme incompleto.',
    'No trae completos sus textos y útiles escolares.',
    'Usa vocabulario Soez.',
    'Interrumpe el desarrollo de las clases.',
    'Presenta sus tareas escolares incompletas y fuera del tiempo fijado.',
    'Usa tintes, maquillajes, joyas y celulares.',
    'Se presenta el estudiante con corte de cabello inadecuado.',
    'Tiene Deméritos'
  ];

  toggleModoConducta() {
    this.modoConducta = !this.modoConducta;
    if (this.modoConducta) {
      this.cargarPlanillaConducta();
    } else {
      this.cargarPlanilla();
    }
  }

  async cargarPlanillaConducta() {
    if (!this.selGrado || !this.selMateria || !this.selTrimestre) {
        this.toast.warning('Seleccione Grado, Materia y Trimestre primero.');
        this.modoConducta = false;
        return;
    }

    this.loading = true;
    
    // Identificamos las actividades de conducta (1 al 15)
    const acts = this.actividades.filter(a => {
        const match = a.nombre.match(/^(\d+)\./);
        if (match) {
            const num = parseInt(match[1]);
            return num >= 1 && num <= 15;
        }
        return false;
    }).sort((a, b) => {
        const numA = parseInt(a.nombre.match(/^(\d+)\./)![1]);
        const numB = parseInt(b.nombre.match(/^(\d+)\./)![1]);
        return numA - numB;
    });

    this.itemsConducta = acts;

    if (this.itemsConducta.length === 0) {
        this.loading = false;
        // No cerramos el modoConducta para mostrar el botón de creación automática
        this.planillaConducta = []; 
        return;
    }

    try {
        const mapEstudiantes = new Map<number, any>();
        
        // Cargamos todas las planillas en paralelo para las actividades encontradas
        const promesas = this.itemsConducta.map(act => 
            this.calificacionService.obtenerPlanilla(this.selGrado, act.id!).toPromise()
        );

        const resultados = await Promise.all(promesas);

        resultados.forEach((planilla, index) => {
            const actId = this.itemsConducta[index].id!;
            planilla?.forEach(item => {
                if (!mapEstudiantes.has(item.estudianteId)) {
                    mapEstudiantes.set(item.estudianteId, {
                        estudianteId: item.estudianteId,
                        nombre: `${item.apellidoEstudiante}, ${item.nombreEstudiante}`,
                        notas: {},
                        modificado: false
                    });
                }
                const est = mapEstudiantes.get(item.estudianteId);
                est.notas[actId] = item.nota;
            });
        });

        this.planillaConducta = Array.from(mapEstudiantes.values())
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        this.loading = false;
    } catch (error) {
        console.error('Error cargando planilla de conducta:', error);
        this.loading = false;
        this.toast.error('Error al cargar datos de conducta.');
    }
  }

  getDescConducta(index: number): string {
    return this.descripcionesConducta[index] || '';
  }

  getNumeroConducta(nombre: string): string {
    const match = nombre.match(/^(\d+)\./);
    return match ? match[1] : '?';
  }

  marcarCambioConducta(est: any) {
    est.modificado = true;
  }

  guardarConducta() {
    this.guardando = true;
    const aGuardar = this.planillaConducta.filter(p => p.modificado);

    if (aGuardar.length === 0) {
        this.guardando = false;
        this.toast.info('No hay cambios para guardar');
        return;
    }

    const requests: CalificacionRequest[] = [];
    aGuardar.forEach(est => {
        Object.keys(est.notas).forEach(actId => {
            const nota = est.notas[actId];
            if (nota !== undefined && nota !== null && nota !== '') {
                requests.push({
                    estudianteId: est.estudianteId,
                    actividadId: Number(actId),
                    nota: Number(nota),
                    observacion: ''
                });
            }
        });
    });

    let completados = 0;
    let errores = 0;

    if (requests.length === 0) {
        this.guardando = false;
        this.toast.info('No hay notas válidas para guardar');
        return;
    }

    requests.forEach(req => {
        this.calificacionService.guardarCalificacion(req).subscribe({
            next: () => {
                completados++;
                this.verificarFinGuardado(completados, requests.length, aGuardar);
            },
            error: () => {
                completados++;
                errores++;
                this.verificarFinGuardado(completados, requests.length, aGuardar);
            }
        });
    });
  }

  private verificarFinGuardado(completados: number, total: number, items: any[]) {
    if (completados === total) {
        this.guardando = false;
        items.forEach(i => i.modificado = false);
        this.toast.success('Cambios de conducta guardados correctamente');
    }
  }

  crearActividadesConducta() {
    if (!this.selMateria || !this.selTrimestre) return;
    
    this.loading = true;
    let creadas = 0;
    
    // Creamos las 15 actividades secuencialmente
    this.descripcionesConducta.forEach((desc, i) => {
      const nuevaAct = {
        nombre: `${i + 1}. ${desc}`,
        ponderacion: 0, // 0% para que no afecte promedios académicos
        materiaId: Number(this.selMateria),
        trimestreId: Number(this.selTrimestre),
        descripcion: 'Auto-generado para Comportamiento',
        promedia: false
      };

      this.actividadService.crear(nuevaAct).subscribe({
        next: () => {
          creadas++;
          if (creadas === 15) {
            // Una vez creadas las 15, refrescamos los catálogos y la matriz
            this.actividadService.getByMateriaAndTrimestre(this.selMateria, this.selTrimestre).subscribe(data => {
              this.actividades = data;
              this.cargarPlanillaConducta();
              this.toast.success('Las 15 actividades de conducta han sido creadas con éxito');
            });
          }
        },
        error: (err) => {
          console.error('Error creando rasgo ' + (i+1), err);
          creadas++; 
          if (creadas === 15) this.loading = false;
        }
      });
    });
  }

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

    if (Number(this.selMateria) > 0 && Number(this.selTrimestre) > 0) {
      
      this.actividadService.getByMateriaAndTrimestre(
        Number(this.selMateria), 
        Number(this.selTrimestre)
      ).subscribe(data => {
          this.actividades = data;
          // Debug para ver si llegan datos offline
          console.log('Actividades cargadas:', data); 
      });
    }
  }

  cargarPlanilla() {
    if (!this.selGrado || !this.selActividad) return;

    this.loading = true;
    this.calificacionService.obtenerPlanilla(this.selGrado, this.selActividad)
      .subscribe({
        next: (data) => {
          const uniqueData = Array.from(new Map(data.map(item => [item.estudianteId, item])).values());
          this.planilla = uniqueData;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
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
      this.toast.info('No hay cambios para guardar');
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
          item.modificado = false;
          if (procesados === aGuardar.length) {
            this.guardando = false;
            this.toast.success('Notas guardadas correctamente');
          }
        },
        error: () => {
          procesados++; // Contamos aunque falle para no bloquear
          if (procesados === aGuardar.length) this.guardando = false;
        }
      });
    });
  }

  logout() {
    this.authService.logout();
  }
}
