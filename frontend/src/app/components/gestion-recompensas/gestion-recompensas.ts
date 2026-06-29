import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Recompensa, RecompensaService } from '../../services/recompensa';
import { Estudiante, EstudianteService } from '../../services/estudiante';
import { Grado, GradoService } from '../../services/grado';
import { Modal } from 'bootstrap';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-gestion-recompensas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './gestion-recompensas.html',
  styleUrls: ['./gestion-recompensas.css']
})
export class GestionRecompensasComponent implements OnInit, AfterViewInit {
  // Inyección de servicios
  private recompensaService = inject(RecompensaService);
  private estudianteService = inject(EstudianteService);
  private gradoService = inject(GradoService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  // Referencias a modales
  @ViewChild('recompensaModal') recompensaModalElement!: ElementRef;
  @ViewChild('puntosModal') puntosModalElement!: ElementRef;
  
  private modalInstance: Modal | null = null;
  private puntosModalInstance: Modal | null = null;

  // Propiedades del componente
  recompensas: Recompensa[] = [];
  estudiantesPuntos: Estudiante[] = [];
  grados: Grado[] = [];
  selectedGradoId: number | null = null;
  
  recompensaForm: FormGroup;
  isEditMode = false;
  currentRecompensaId: number | null = null;
  
  niveles = ['Bronce', 'Plata', 'Oro', 'Epico'];

  // Estado de carga para UX
  isLoading = false;
  isLoadingPuntos = false;
  isDeleting: { [key: number]: boolean } = {};

  constructor() {
    // Inicialización del formulario
    this.recompensaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      costo: [0, [Validators.required, Validators.min(1)]],
      stock: [null, [Validators.min(0)]],
      imagenUrl: ['Bronce', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarRecompensas();
    this.cargarGrados();
  }

  ngAfterViewInit(): void {
    // Inicializar instancias de modales
    if (this.recompensaModalElement) {
      this.modalInstance = new Modal(this.recompensaModalElement.nativeElement);
    }
    if (this.puntosModalElement) {
      this.puntosModalInstance = new Modal(this.puntosModalElement.nativeElement);
    }
  }

  cargarRecompensas(): void {
    this.isLoading = true;
    this.recompensaService.getRecompensas().subscribe(data => {
      this.recompensas = data;
      this.isLoading = false;
    });
  }

  cargarGrados(): void {
    this.gradoService.getGrados().subscribe(data => {
      this.grados = data;
    });
  }

  cargarPuntosEstudiantes(): void {
    if (!this.selectedGradoId) {
      this.estudiantesPuntos = [];
      return;
    }

    this.isLoadingPuntos = true;
    this.estudianteService.getEstudiantesPorGrado(this.selectedGradoId).subscribe({
      next: (data) => {
        this.estudiantesPuntos = data.sort((a, b) => (b.saldoTokens || 0) - (a.saldoTokens || 0));
        this.isLoadingPuntos = false;
      },
      error: () => {
        this.isLoadingPuntos = false;
        this.estudiantesPuntos = [];
      }
    });
  }

  openPuntosModal(): void {
    // Si ya hay un grado seleccionado, cargamos automáticamente
    if (this.selectedGradoId) {
      this.cargarPuntosEstudiantes();
    } else {
      this.estudiantesPuntos = [];
    }
    this.puntosModalInstance?.show();
  }

  getIconClass(nivel: string | undefined): string {
    switch (nivel) {
      case 'Bronce': return 'bi-award';
      case 'Plata': return 'bi-award-fill';
      case 'Oro': return 'bi-trophy-fill';
      case 'Epico': return 'bi-gem';
      default: return 'bi-award';
    }
  }

  getIconColor(nivel: string | undefined): string {
    switch (nivel) {
      case 'Bronce': return '#cd7f32'; // Bronze
      case 'Plata': return '#708090'; // SlateGray (Silver-ish)
      case 'Oro': return '#ffd700'; // Gold
      case 'Epico': return '#9932cc'; // DarkOrchid (Epic)
      default: return '#6c757d'; // Secondary
    }
  }

  // --- Métodos para el Modal de Recompensa ---
  openCreateModal(): void {
    this.isEditMode = false;
    this.recompensaForm.reset({ costo: 1, stock: null });
    this.currentRecompensaId = null;
    this.modalInstance?.show();
  }

  openEditModal(recompensa: Recompensa): void {
    this.isEditMode = true;
    this.currentRecompensaId = recompensa.id!;
    this.recompensaForm.patchValue(recompensa);
    this.modalInstance?.show();
  }

  // --- Métodos CRUD ---
  guardarRecompensa(): void {
    if (this.recompensaForm.invalid) {
      return;
    }
    this.isLoading = true;
    const recompensaData = { ...this.recompensaForm.value };

    if (this.isEditMode && this.currentRecompensaId) {
      const original = this.recompensas.find(r => r.id === this.currentRecompensaId);
      if (original) {
        recompensaData.profesor = original.profesor;
      }
      
      this.recompensaService.updateRecompensa(this.currentRecompensaId, recompensaData).subscribe({
        next: () => {
          this.toast.success('Recompensa actualizada');
          this.cargarRecompensas();
          this.modalInstance?.hide();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al actualizar:', error);
          this.isLoading = false;
          this.toast.error('No tienes permisos para editar esta recompensa o ha ocurrido un error.');
        }
      });
    } else {
      this.recompensaService.createRecompensa(recompensaData).subscribe({
        next: () => {
          this.toast.success('Recompensa creada');
          this.cargarRecompensas();
          this.modalInstance?.hide();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al crear:', error);
          this.isLoading = false;
          this.toast.error('Error al crear la recompensa.');
        }
      });
    }
  }

  eliminarRecompensa(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta recompensa?')) {
      this.isDeleting[id] = true;
      this.recompensaService.deleteRecompensa(id).subscribe({
        next: () => {
          this.toast.success('Recompensa eliminada');
          this.cargarRecompensas();
          delete this.isDeleting[id];
        }
      });
    }
  }
}