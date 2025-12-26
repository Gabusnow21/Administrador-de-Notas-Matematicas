import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Recompensa, RecompensaService } from '../../services/recompensa';
import { Modal } from 'bootstrap';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-gestion-recompensas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gestion-recompensas.html',
  styleUrls: ['./gestion-recompensas.css']
})
export class GestionRecompensasComponent implements OnInit, AfterViewInit {
  // Inyección de servicios
  private recompensaService = inject(RecompensaService);
  private fb = inject(FormBuilder);

  // Referencia al elemento del modal en el HTML
  @ViewChild('recompensaModal') recompensaModalElement!: ElementRef;
  private modalInstance: Modal | null = null;

  // Propiedades del componente
  recompensas: Recompensa[] = [];
  recompensaForm: FormGroup;
  isEditMode = false;
  currentRecompensaId: number | null = null;
  
  niveles = ['Bronce', 'Plata', 'Oro', 'Epico'];

  // Estado de carga para UX
  isLoading = false;
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
  }

  ngAfterViewInit(): void {
    // Inicializar la instancia del modal de Bootstrap
    if (this.recompensaModalElement) {
      this.modalInstance = new Modal(this.recompensaModalElement.nativeElement);
    }
  }

  cargarRecompensas(): void {
    this.isLoading = true;
    this.recompensaService.getRecompensas().subscribe(data => {
      this.recompensas = data;
      this.isLoading = false;
    });
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

  // --- Métodos para el Modal ---
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
      // Para actualizar, buscamos la recompensa original para conservar el profesor si existe
      const original = this.recompensas.find(r => r.id === this.currentRecompensaId);
      if (original) {
        recompensaData.profesor = original.profesor;
      }
      
      this.recompensaService.updateRecompensa(this.currentRecompensaId, recompensaData).subscribe({
        next: () => {
          this.cargarRecompensas();
          this.modalInstance?.hide();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al actualizar:', error);
          this.isLoading = false;
          alert('No tienes permisos para editar esta recompensa o ha ocurrido un error.');
        }
      });
    } else {
      this.recompensaService.createRecompensa(recompensaData).subscribe({
        next: () => {
          this.cargarRecompensas();
          this.modalInstance?.hide();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al crear:', error);
          this.isLoading = false;
          alert('Error al crear la recompensa.');
        }
      });
    }
  }

  eliminarRecompensa(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta recompensa?')) {
      this.isDeleting[id] = true;
      this.recompensaService.deleteRecompensa(id).subscribe(() => {
        this.cargarRecompensas();
        delete this.isDeleting[id];
      });
    }
  }
}