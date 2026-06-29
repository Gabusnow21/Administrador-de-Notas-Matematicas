import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Trimestre, TrimestreService } from '../../services/trimestre';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-gestion-trimestres',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './gestion-trimestres.html',
  styleUrl: './gestion-trimestres.css'
})
export class GestionTrimestres implements OnInit {
  private trimestreService = inject(TrimestreService);
  public authService = inject(AuthService);

  trimestres: Trimestre[] = [];
  loading = true;
  procesando = false;
  esEdicion = false;

  trimestreForm: Partial<Trimestre> = {
    nombre: '',
    anioEscolar: new Date().getFullYear(),
    activo: true
  };

  ngOnInit() {
    this.cargarTrimestres();
  }

  cargarTrimestres() {
    this.loading = true;
    this.trimestreService.getAll().subscribe({
      next: (data) => {
        this.trimestres = data;
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  guardar() {
    this.procesando = true;
    const obs = this.esEdicion
      ? this.trimestreService.actualizar(this.trimestreForm as Trimestre)
      : this.trimestreService.crear(this.trimestreForm);

    obs.subscribe({
      next: () => {
        this.procesando = false;
        this.cancelarEdicion();
        this.cargarTrimestres();
      },
      error: (e) => {
        this.procesando = false;
        alert('Error al guardar trimestre');
        console.error(e);
      }
    });
  }

  editar(t: Trimestre) {
    this.esEdicion = true;
    this.trimestreForm = { ...t };
  }

  eliminar(t: Trimestre) {
    if (!confirm('¿Eliminar trimestre?')) return;
    this.trimestreService.borrar(t.id).subscribe({
      next: () => this.cargarTrimestres(),
      error: () => alert('Error al eliminar')
    });
  }

  cancelarEdicion() {
    this.esEdicion = false;
    this.trimestreForm = {
      nombre: '',
      anioEscolar: new Date().getFullYear(),
      activo: true
    };
  }
}
