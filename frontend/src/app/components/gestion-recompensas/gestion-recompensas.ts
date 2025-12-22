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
      imagenUrl: ['']
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
    const recompensaData = this.recompensaForm.value;

    const operation = this.isEditMode && this.currentRecompensaId
      ? this.recompensaService.updateRecompensa(this.currentRecompensaId, recompensaData)
      : this.recompensaService.createRecompensa(recompensaData);

    operation.subscribe(() => {
      this.cargarRecompensas();
      this.modalInstance?.hide();
      this.isLoading = false;
    });
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