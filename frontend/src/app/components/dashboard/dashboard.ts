import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Grado, GradoService } from '../../services/grado';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private gradoService = inject(GradoService);
  private cdr = inject(ChangeDetectorRef);

  grados: Grado[] = [];//Aca se guardan los datos de los grados
  loading: boolean = true;//Indicador de carga
  mostrarFormulario: boolean = false;//Controla la visibilidad del formulario
  procesando: boolean = false;//Indicador de procesamiento del formulario
  
  //Modelo para el nuevo grado
  nuevoGrado = {
    nivel: '',       // Ej: "7mo Grado"
    seccion: '',     // Ej: "B"
    anioEscolar: new Date().getFullYear() // Año actual por defecto
  };

  ngOnInit(): void {
    this.cargarGrados();
  }

  //Cargar los grados desde el servicio
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

  //Guardar nuevo grado
  guardarGrado() {
    this.procesando = true;
    this.gradoService.crearGrado(this.nuevoGrado).subscribe({
      next: (res) => {
        console.log('Grado creado:', res);
        this.procesando = false;
        this.mostrarFormulario = false; // Ocultar formulario
        
        // Limpiar campos
        this.nuevoGrado = {
          nivel: '',
          seccion: '',
          anioEscolar: new Date().getFullYear()
        };

        // Recargar la lista para ver el nuevo
        this.loading = true;
        this.cargarGrados();
      },
      error: (err) => {
        console.error('Error creando grado:', err);
        alert('Error al crear el grado. Revisa la consola.');
        this.procesando = false;
        this.cdr.detectChanges();
      }
    });
  }

  //Eliminar grado con confirmación
  eliminarGrado(id: number, nivel: string) {
    // 1. Preguntar confirmación
    const confirmacion = confirm(`¿Estás seguro de eliminar el ${nivel}? Esta acción no se puede deshacer.`);
    
    if (!confirmacion) return; // Si dice cancelar, no hacemos nada

    // 2. Llamar al servicio
    this.gradoService.deleteGrado(id).subscribe({
      next: () => {
        // 3. Si sale bien, recargamos la lista
        this.cargarGrados();
      },
      error: (err) => {
        console.error(err);
        // Mensaje amigable por si falla la base de datos (Foreign Key)
        alert('No se pudo eliminar el grado. Es posible que tenga estudiantes inscritos.');
      }
    });
  }

  //Cerrar sesión
  logout() {
    this.authService.logout();
  }

}
