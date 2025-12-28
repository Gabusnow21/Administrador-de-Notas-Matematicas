import { Component, inject, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EstudianteService } from '../../services/estudiante'; // Asegúrate que la ruta es correcta

@Component({
  selector: 'app-acceso-progreso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './acceso-progreso.html',
  styleUrls: ['./acceso-progreso.css']
})
export class AccesoProgresoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private estudianteService = inject(EstudianteService);

  @ViewChildren('codeInput') inputElements!: QueryList<ElementRef<HTMLInputElement>>;
  
  codeForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  
  ngOnInit(): void {
    const controls: { [key: string]: any } = {};
    for (let i = 0; i < 8; i++) {
      controls['digit' + i] = ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]$/)]];
    }
    this.codeForm = this.fb.group(controls);
  }

  onInput(event: any, index: number): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.toUpperCase();
    this.codeForm.get('digit' + index)?.setValue(value);
    
    if (value && index < 7) {
      this.inputElements.toArray()[index + 1].nativeElement.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.codeForm.get('digit' + index)?.value && index > 0) {
      this.inputElements.toArray()[index - 1].nativeElement.focus();
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }

  onSubmit(): void {
    if (this.codeForm.invalid) {
      this.errorMessage = 'Por favor, introduce un código de 8 caracteres válido.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;

    const code = Object.values(this.codeForm.value).join('');

    this.estudianteService.getEstudiantePorCodigo(code).subscribe({
      next: (estudiante) => {
        this.isLoading = false;
        // Guardamos los datos del estudiante en el servicio para que el otro componente los recoja
        this.estudianteService.setEstudianteActual(estudiante);
        this.router.navigate(['/mi-progreso/detalle']); // Navegamos a la vista de detalle
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Código no válido o no encontrado. Inténtalo de nuevo.';
        this.codeForm.reset();
        this.inputElements.first.nativeElement.focus();
      }
    });
  }
}
