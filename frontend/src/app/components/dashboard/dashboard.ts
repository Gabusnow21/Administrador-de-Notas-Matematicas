import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Grado, GradoService } from '../../services/grado';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { SyncService } from '../../services/sync';

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
  public syncService = inject(SyncService); // <--- INYECTAR PÚBLICO


  grados: Grado[] = [];//Aca se guardan los datos de los grados
  loading: boolean = true;//Indicador de carga
  mostrarFormulario: boolean = false;//Controla la visibilidad del formulario
  procesando: boolean = false;//Indicador de procesamiento del formulario
  updateEdicion: boolean = false;//Indicador de modo edicion
  
  
  //Modelo para el nuevo grado
  nuevoGrado: any = {
    id: null,
    nivel: '',       // Ej: "7mo Grado"
    seccion: '',     // Ej: "B"
    anioEscolar: new Date().getFullYear() // Año actual por defecto
  };
  
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.cargarGrados();
  }

  // Forzar sincronización manual
  forzarSincronizacion() {
    this.syncService.sincronizar();
  }

  // editar grado
  editarGrado(grado: Grado) {
    this.updateEdicion = true;
    this.mostrarFormulario = true;
    // Copiamos los datos para no modificar la tarjeta en vivo mientras escribimos
    this.nuevoGrado = { ...grado }; 
  }

  // iniciar creacion de grado
  iniciarCreacion() {
    this.updateEdicion = false;
    this.mostrarFormulario = !this.mostrarFormulario;
    this.nuevoGrado = {
      id: null,
      nivel: '',
      seccion: '',
      anioEscolar: new Date().getFullYear()
    };
  }

  //Cargar los grados desde el servicio
  cargarGrados() {
    this.gradoService.getGrados().subscribe({
      next: (data) => {
        this.grados = data;
        this.loading = false;
        // ¡Ya no hace falta nada más!
      },
      error: (err) => { 
        console.error(err); 
        this.loading = false; 
      }
    });

  }

  //Guardar nuevo grado
  guardarGrado() {
    this.procesando = true;

    if (this.updateEdicion) {
      // --- MODO EDICIÓN (PUT) ---
      this.gradoService.actualizarGrado(this.nuevoGrado).subscribe({
        next: () => {
          this.finalizarOperacion('Grado actualizado correctamente');
        },
        error: (err) => this.manejarError(err)
      });
    } else {
      // --- MODO CREACIÓN (POST) ---
      this.gradoService.crearGrado(this.nuevoGrado).subscribe({
        next: () => {
          this.finalizarOperacion('Grado creado correctamente');
        },
        error: (err) => this.manejarError(err)
      })
  }
  }

  //Eliminar grado con confirmación
  eliminarGrado(grado: Grado) { // <--- Ahora recibe el objeto Grado
    const confirmacion = confirm(`¿Estás seguro de eliminar el ${grado.nivel}?`);
    
    if (!confirmacion) return;

    // Llamamos al servicio con el objeto completo
    this.gradoService.deleteGrado(grado).subscribe({
      next: () => {
        this.cargarGrados(); // Recargar lista
      },
      error: (err) => {
        console.error(err);
        alert('No se pudo eliminar el grado.');
      }
    });
  }

  // Helpers para no repetir código
  finalizarOperacion(mensaje: string) {
    console.log(mensaje);
    this.procesando = false;
    this.mostrarFormulario = false;
    this.cargarGrados(); // Recargar lista
  }

  manejarError(err: any) {
    console.error(err);
    alert('Ocurrió un error. Revisa la consola.');
    this.procesando = false;
  }

  //Cerrar sesión
  logout() {
    this.authService.logout();
  }

}
