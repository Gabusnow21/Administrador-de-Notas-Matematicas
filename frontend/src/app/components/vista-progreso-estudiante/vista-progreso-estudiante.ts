import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Estudiante, EstudianteService } from '../../services/estudiante';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-vista-progreso-estudiante',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './vista-progreso-estudiante.html',
  styleUrls: ['./vista-progreso-estudiante.css']
})
export class VistaProgresoEstudiante implements OnInit {
  private estudianteService = inject(EstudianteService);
  private router = inject(Router);

  estudiante: Estudiante | null = null;
  isLoading = true;
  puntosTotales = 0;
  nivelActual = 'Sin Nivel';
  puntosParaSiguiente = 0;
  progresoPorcentaje = 0;

  niveles = [
    { nombre: 'Bronce', min: 10, max: 50, color: '#10b981', icon: '🌿' },
    { nombre: 'Plata', min: 75, max: 150, color: '#f59e0b', icon: '⭐' },
    { nombre: 'Oro', min: 200, max: 350, color: '#ef4444', icon: '🏆' },
    { nombre: 'Épico', min: 400, max: 500, color: '#a855f7', icon: '💎' }
  ];

  ngOnInit(): void {
    this.cargarDatosEstudiante();
  }

  cargarDatosEstudiante(): void {
    this.isLoading = true;
    const estudiante = this.estudianteService.getEstudianteActual();

    if (estudiante) {
      this.estudiante = estudiante;
      this.puntosTotales = this.estudiante.saldoTokens || 0;
      this.calcularNivel();
      this.isLoading = false;
    } else {
      this.router.navigate(['/mi-progreso']);
    }
  }

  calcularNivel(): void {
    let nivelEncontrado = this.niveles[0];
    for (const n of this.niveles) {
      if (this.puntosTotales >= n.min) {
        nivelEncontrado = n;
      }
    }
    
    this.nivelActual = this.puntosTotales < 10 ? 'Novato' : nivelEncontrado.nombre;
    
    const index = this.niveles.indexOf(nivelEncontrado);
    const siguienteNivel = this.niveles[index + 1] || null;
    
    if (siguienteNivel) {
      this.puntosParaSiguiente = siguienteNivel.min - this.puntosTotales;
      const rango = siguienteNivel.min - (index === 0 && this.puntosTotales < 10 ? 0 : nivelEncontrado.min);
      const progreso = this.puntosTotales - (index === 0 && this.puntosTotales < 10 ? 0 : nivelEncontrado.min);
      this.progresoPorcentaje = Math.min(Math.max((progreso / rango) * 100, 0), 100);
    } else {
      this.puntosParaSiguiente = 0;
      this.progresoPorcentaje = 100;
    }
  }

  getNivelColor(): string {
    const n = this.niveles.find(l => l.nombre === this.nivelActual);
    return n ? n.color : '#64748b';
  }
}