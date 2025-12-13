import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Materia, MateriaService } from '../../services/materia';
import { Trimestre, TrimestreService } from '../../services/trimestre';
import { Actividad, ActividadService } from '../../services/actividad';

@Component({
  selector: 'app-gestion-actividades',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './gestion-actividades.html',
  styleUrl: './gestion-actividades.css',
})
export class GestionActividades implements OnInit {
  private materiaService = inject(MateriaService);
  private trimestreService = inject(TrimestreService);
  private actividadService = inject(ActividadService);

  materias: Materia[] = [];
  trimestres: Trimestre[] = [];
  actividades: Actividad[] = [];

  selMateria: number = 0;
  selTrimestre: number = 0;

  esEdicion: boolean = false;
  procesando: boolean = false;
  ponderacionTotal: number = 0;

  actividadForm: Partial<Actividad> = {
    nombre: '',
    descripcion: '',
    ponderacion: 0,
    promedia: false
  };

  selectedActividad: Actividad | null = null;
  modoEdicionSubactividad: boolean = false;
  subActividadForm: Partial<Actividad> = {};

  ngOnInit() {
    this.cargarCatalogos();
  }

  cargarCatalogos() {
    this.materiaService.getAll().subscribe(d => this.materias = d);
    this.trimestreService.getAll().subscribe(d => this.trimestres = d);
  }

  cargarActividades() {
    this.actividades = [];
    if (this.selMateria > 0 && this.selTrimestre > 0) {
      this.actividadService.getByMateriaAndTrimestre(this.selMateria, this.selTrimestre)
        .subscribe({
          next: (data) => {
            console.log('Datos de actividades recibidos:', JSON.stringify(data, null, 2));
            this.actividades = data;
            this.ponderacionTotal = data.reduce((sum, act) => sum + (act.ponderacion || 0), 0);
          },
          error: (err) => console.error(err)
        });
    }
    this.cancelarEdicion();
  }

  guardar() {
    this.procesando = true;

    const formPonderacion = this.actividadForm.ponderacion || 0;
    const ponderacionOtrasRaices = this.actividades
      .filter(act => act.id !== this.actividadForm.id)
      .reduce((sum, act) => sum + (act.ponderacion || 0), 0);

    if (ponderacionOtrasRaices + formPonderacion > 100) {
      alert('La ponderación total de las actividades principales no puede exceder el 100%.');
      this.procesando = false;
      return;
    }

    const payload: Partial<Actividad> = {
      ...this.actividadForm,
      materiaId: Number(this.selMateria),
      trimestreId: Number(this.selTrimestre),
      parentId: undefined 
    };

    const serviceCall = this.esEdicion
      ? this.actividadService.actualizar(payload)
      : this.actividadService.crear(payload);

    serviceCall.subscribe({
      next: () => this.finalizarOperacion(),
      error: (e) => this.handleError(e, this.esEdicion ? 'actualizar' : 'crear')
    });
  }

  editar(act: Actividad) {
    this.esEdicion = true;
    this.actividadForm = { ...act };
  }

  eliminar(actividad: Actividad) {
    if (!confirm('¿Eliminar actividad? Se borrarán las notas y sub-actividades asociadas.')) return;
    this.actividadService.borrar(actividad).subscribe(() => {
      if (this.selectedActividad) {
        this.cerrarModal();
      }
      this.cargarActividades();
    });
  }

  cancelarEdicion() {
    this.esEdicion = false;
    this.actividadForm = {
      nombre: '',
      descripcion: '',
      ponderacion: 0,
      promedia: false
    };
  }

  verSubActividades(actividad: Actividad) {
    this.selectedActividad = actividad;
    this.modoEdicionSubactividad = false;
  }

  cerrarModal() {
    this.selectedActividad = null;
    this.modoEdicionSubactividad = false;
  }

  iniciarSubActividad() {
    this.modoEdicionSubactividad = true;
    this.subActividadForm = {
      nombre: '',
      descripcion: '',
      ponderacion: 0,
      parentId: this.selectedActividad?.id
    };
  }

  editarSubactividad(sub: Actividad) {
    this.modoEdicionSubactividad = true;
    this.subActividadForm = { ...sub };
  }

  cancelarEdicionSubactividad() {
    this.modoEdicionSubactividad = false;
  }

  guardarSubactividad() {
    this.procesando = true;
    const formPonderacion = this.subActividadForm.ponderacion || 0;

    if (this.selectedActividad && this.selectedActividad.subActividades) {
      const ponderacionHermanas = this.selectedActividad.subActividades
        .filter(sub => sub.id !== this.subActividadForm.id)
        .reduce((sum, sub) => sum + (sub.ponderacion || 0), 0);

      if (ponderacionHermanas + formPonderacion > (this.selectedActividad.ponderacion || 0)) {
        alert(`La suma de ponderaciones de las sub-actividades no puede exceder la del padre (${this.selectedActividad.ponderacion}%).`);
        this.procesando = false;
        return;
      }
    }
    
    const payload: Partial<Actividad> = {
      ...this.subActividadForm,
      materiaId: Number(this.selMateria),
      trimestreId: Number(this.selTrimestre)
    };
    
    console.log('Payload de sub-actividad a guardar:', JSON.stringify(payload, null, 2));

    const isEdit = !!payload.id;
    const serviceCall = isEdit
      ? this.actividadService.actualizar(payload)
      : this.actividadService.crear(payload);

    serviceCall.subscribe({
      next: () => {
        this.finalizarOperacion(true);
      },
      error: (e) => this.handleError(e, isEdit ? 'actualizar' : 'crear')
    });
  }

  private finalizarOperacion(enModal: boolean = false) {
    this.procesando = false;
    if (enModal) {
      this.cerrarModal();
    } else {
      this.cancelarEdicion();
    }
    this.cargarActividades();
  }

  private handleError(e: any, accion: string) {
    console.error(e);
    this.procesando = false;
    alert(`Error al ${accion}: ` + (e.error?.message || e.error || e.message));
  }
}
