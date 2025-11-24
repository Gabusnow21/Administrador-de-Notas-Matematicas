import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Grado, GradoService } from '../../services/grado';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private gradoService = inject(GradoService);
  private cdr = inject(ChangeDetectorRef);

  grados: Grado[] = [];//Aca se guardan los datos de los grados
  loading: boolean = true;//Indicador de carga
  
  ngOnInit(): void {
    this.cargarGrados();
  }

  cargarGrados() {
    console.log('1. Iniciando petición...'); // <--- DEBUG 1

    this.gradoService.getGrados().subscribe({
      next: (data) => {
        console.log('2. ¡Datos recibidos en el componente!', data); // <--- DEBUG 2
        this.grados = data;
        this.loading = false; 
        this.cdr.detectChanges(); // Forzar detección de cambios
        console.log('3. Loading puesto en FALSE'); // <--- DEBUG 3
      },
      error: (err) => {
        console.error('2. Error en la suscripción:', err); // <--- DEBUG ERROR
        this.loading = false;
      },
      complete: () => {
        console.log('4. Observable completado'); // <--- DEBUG 4
      }
    });
  }

  logout() {
    this.authService.logout();
  }

}
