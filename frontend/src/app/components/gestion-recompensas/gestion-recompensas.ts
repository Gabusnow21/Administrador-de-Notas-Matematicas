import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Recompensa, RecompensaService } from '../../services/recompensa';

@Component({
  selector: 'app-gestion-recompensas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestion-recompensas.html',
  styleUrls: ['./gestion-recompensas.css']
})
export class GestionRecompensasComponent implements OnInit {
  // Inyección de servicios
  private recompensaService = inject(RecompensaService);
  private fb = inject(FormBuilder);

  // Propiedades del componente
  recompensas: Recompensa[] = [];
  recompensaForm: FormGroup;
  isEditMode = false;
  currentRecompensaId: number | null = null;
  showModal = false;

  constructor() {
    // Inicialización del formulario
    this.recompensaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      costo: [0, [Validators.required, Validators.min(1)]],
      stock: [null, [Validators.min(0)]],
      imagenUrl: ['']
    });
  }

  ngOnInit(): void {
    this.cargarRecompensas();
  }

  cargarRecompensas(): void {
    this.recompensaService.getRecompensas().subscribe(data => {
      this.recompensas = data;
    });
  }

  // --- Métodos para el Modal ---
  openCreateModal(): void {
    this.isEditMode = false;
    this.recompensaForm.reset({ costo: 0, stock: null });
    this.currentRecompensaId = null;
    this.showModal = true;
  }

  openEditModal(recompensa: Recompensa): void {
    this.isEditMode = true;
    this.currentRecompensaId = recompensa.id!;
    this.recompensaForm.patchValue(recompensa);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  // --- Métodos CRUD ---
  guardarRecompensa(): void {
    if (this.recompensaForm.invalid) {
      return;
    }

    const recompensaData = this.recompensaForm.value;

    if (this.isEditMode && this.currentRecompensaId) {
      // Actualizar
      this.recompensaService.updateRecompensa(this.currentRecompensaId, recompensaData).subscribe(() => {
        this.cargarRecompensas();
        this.closeModal();
      });
    } else {
      // Crear
      this.recompensaService.createRecompensa(recompensaData).subscribe(() => {
        this.cargarRecompensas();
        this.closeModal();
      });
    }
  }

  eliminarRecompensa(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta recompensa?')) {
      this.recompensaService.deleteRecompensa(id).subscribe(() => {
        this.cargarRecompensas();
      });
    }
  }
}