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
    ponderacion: 0,
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
    // 1. Limpiar lista anterior para evitar mezclas visuales
    this.actividades = []; 
    
    // 2. VALIDACIÓN ESTRICTA: Solo llamar si ambos son mayores a 0
    if (this.selMateria > 0 && this.selTrimestre > 0) {
      
      this.actividadService.getByMateriaAndTrimestre(this.selMateria, this.selTrimestre)
        .subscribe({
          next: (data) => {
            this.actividades = data;
            // Opcional: Debug para ver qué llega
            console.log('Actividades cargadas:', data); 
          },
          error: (err) => console.error(err)
        });
    }
    
    this.cancelarEdicion();
  }

   // Guardar nueva o editada
  guardar() {
    this.procesando = true;

    // 1. Crear el objeto PLANO que espera el Backend
    const payload = {
      nombre: this.actividadForm.nombre,
      descripcion: this.actividadForm.descripcion,
      // OJO AQUÍ: Asegúrate de usar la propiedad correcta. 
      // Si tu interfaz tiene 'ponderacion', úsala. Si usaste 'porcentaje', cámbialo.
      ponderacion: this.actividadForm.ponderacion, 
      
      // IDs directos
      materiaId: Number(this.selMateria), 
      trimestreId: Number(this.selTrimestre)
    };

    if (this.esEdicion) {
      // Para editar, necesitamos agregar el ID de la actividad al payload
      const payloadEdicion = { ...payload, id: this.actividadForm.id };

      // 👇 CORRECCIÓN: Enviar 'payloadEdicion', NO 'this.actividadForm'
      // Usamos 'as any' para evitar quejas de TypeScript por la diferencia de estructura
      this.actividadService.actualizar(payloadEdicion as any).subscribe({
        next: () => this.finalizarOperacion(),
        error: (e) => { 
            console.error(e); 
            this.procesando = false; 
            alert('Error al actualizar'); 
        }
      });
    } else {
      // 👇 CORRECCIÓN: Enviar 'payload', NO 'this.actividadForm'
      this.actividadService.crear(payload as any).subscribe({
        next: () => this.finalizarOperacion(),
        error: (e) => { 
            console.error(e); 
            this.procesando = false; 
            alert('Error al crear'); 
        }
      });
    }
  }

  // Cargar datos en el formulario para editar
  editar(act: Actividad) {
    this.esEdicion = true;
    this.actividadForm = { ...act };
  }

  // Eliminar una Actividad
  eliminar(id: number) {
    if(!confirm('¿Eliminar actividad? Se borrarán las notas asociadas.')) return;
    this.actividadService.borrar(id).subscribe(() => this.cargarActividades());
  }

  // Cancelar edición
  cancelarEdicion() {
    this.esEdicion = false;
    this.actividadForm = { nombre: '', descripcion: '', ponderacion: 0 };
  }

  private finalizarOperacion() {
    this.procesando = false;
    this.cancelarEdicion();
    this.cargarActividades();
  }

}
