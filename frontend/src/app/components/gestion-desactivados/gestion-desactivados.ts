import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AuditoriaBaja,
  AuditoriaService,
  FiltrosAuditoria,
} from '../../services/auditoria';
import {
  EstudianteDesactivado,
  EstudianteService,
} from '../../services/estudiante';
import {
  UsuarioDesactivado,
  UsuarioService,
} from '../../services/usuario';
import { ToastService } from '../../services/toast.service';

type Pestana = 'desactivados' | 'historial';
type TipoLista = 'profesores' | 'estudiantes';

@Component({
  selector: 'app-gestion-desactivados',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './gestion-desactivados.html',
  styleUrl: './gestion-desactivados.css',
})
export class GestionDesactivados implements OnInit {
  private usuarioService = inject(UsuarioService);
  private estudianteService = inject(EstudianteService);
  private auditoriaService = inject(AuditoriaService);
  private toast = inject(ToastService);

  pestana: Pestana = 'desactivados';
  tipoLista: TipoLista = 'profesores';

  profesores: UsuarioDesactivado[] = [];
  estudiantes: EstudianteDesactivado[] = [];
  cargandoDesactivados = true;
  restauradoId: number | null = null;
  busqueda = '';

  historial: AuditoriaBaja[] = [];
  cargandoHistorial = true;
  totalElementos = 0;
  totalPaginas = 0;
  paginaActual = 0;
  readonly tamanoPagina = 20;

  filtros: FiltrosAuditoria = {
    tipo: '',
    accion: '',
    desde: '',
    hasta: '',
    buscar: '',
  };

  ngOnInit(): void {
    this.cargarDesactivados();
    this.cargarHistorial();
  }

  cambiarPestana(pestana: Pestana) {
    this.pestana = pestana;
    if (pestana === 'historial') {
      this.cargarHistorial();
    }
  }

  cambiarTipoLista(tipo: TipoLista) {
    this.tipoLista = tipo;
  }

  cargarDesactivados() {
    this.cargandoDesactivados = true;

    forkJoin({
      profesores: this.usuarioService.getInactivos().pipe(catchError(() => of([]))),
      estudiantes: this.estudianteService.getEstudiantesInactivos().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ profesores, estudiantes }) => {
        this.profesores = profesores;
        this.estudiantes = estudiantes;
        this.cargandoDesactivados = false;
      },
      error: () => {
        this.cargandoDesactivados = false;
        this.toast.error('No se pudieron cargar los registros desactivados.');
      },
    });
  }

  get profesoresFiltrados(): UsuarioDesactivado[] {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) return this.profesores;

    return this.profesores.filter(
      (p) =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(termino) ||
        p.username.toLowerCase().includes(termino)
    );
  }

  get estudiantesFiltrados(): EstudianteDesactivado[] {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) return this.estudiantes;

    return this.estudiantes.filter(
      (e) =>
        `${e.apellidos} ${e.nombres}`.toLowerCase().includes(termino) ||
        e.codigoProgreso.toLowerCase().includes(termino)
    );
  }

  restaurarProfesor(profesor: UsuarioDesactivado) {
    if (!this.puedeRestaurar('el profesor')) return;

    const nombre = `${profesor.nombre} ${profesor.apellido}`;
    if (!confirm(`¿Restaurar a ${nombre}? Podrá volver a iniciar sesión.`)) return;

    this.restauradoId = profesor.id;
    this.usuarioService.restaurar(profesor.id).subscribe({
      next: () => {
        this.toast.success(`Profesor ${nombre} restaurado correctamente.`);
        this.restauradoId = null;
        this.cargarDesactivados();
        this.cargarHistorial();
      },
      error: (err) => {
        this.restauradoId = null;
        this.toast.error(this.mensajeError(err, 'No se pudo restaurar al profesor.'));
      },
    });
  }

  restaurarEstudiante(estudiante: EstudianteDesactivado) {
    if (!this.puedeRestaurar('el estudiante')) return;

    const nombre = `${estudiante.apellidos}, ${estudiante.nombres}`;
    if (!confirm(`¿Restaurar a ${nombre}? Volverá a su grado con sus notas y asistencias.`)) return;

    this.restauradoId = estudiante.id;
    this.estudianteService.restaurarEstudiante(estudiante.id).subscribe({
      next: () => {
        this.toast.success(`Estudiante ${nombre} restaurado correctamente.`);
        this.restauradoId = null;
        this.cargarDesactivados();
        this.cargarHistorial();
      },
      error: (err) => {
        this.restauradoId = null;
        this.toast.error(this.mensajeError(err, 'No se pudo restaurar al estudiante.'));
      },
    });
  }

  aplicarFiltros() {
    this.paginaActual = 0;
    this.cargarHistorial();
  }

  limpiarFiltros() {
    this.filtros = { tipo: '', accion: '', desde: '', hasta: '', buscar: '' };
    this.paginaActual = 0;
    this.cargarHistorial();
  }

  cargarHistorial() {
    this.cargandoHistorial = true;
    this.auditoriaService
      .getHistorial({
        ...this.filtros,
        page: this.paginaActual,
        size: this.tamanoPagina,
      })
      .subscribe({
        next: (respuesta) => {
          this.historial = respuesta.content;
          this.totalElementos = respuesta.totalElements;
          this.totalPaginas = respuesta.totalPages;
          this.paginaActual = respuesta.number;
          this.cargandoHistorial = false;
        },
        error: (err) => {
          this.cargandoHistorial = false;
          this.toast.error(this.mensajeError(err, 'No se pudo cargar el historial.'));
        },
      });
  }

  paginaAnterior() {
    if (this.paginaActual <= 0) return;
    this.paginaActual--;
    this.cargarHistorial();
  }

  paginaSiguiente() {
    if (this.paginaActual + 1 >= this.totalPaginas) return;
    this.paginaActual++;
    this.cargarHistorial();
  }

  etiquetaTipo(tipo: string): string {
    return tipo === 'PROFESOR' ? 'Profesor' : 'Estudiante';
  }

  etiquetaAccion(accion: string): string {
    return accion === 'DESACTIVACION' ? 'Desactivación' : 'Restauración';
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return '—';
    const valor = new Date(fecha);
    if (isNaN(valor.getTime())) return fecha;
    return valor.toLocaleString('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private puedeRestaurar(entidad: string): boolean {
    if (!navigator.onLine) {
      this.toast.warning(`Necesitas conexión para restaurar ${entidad}.`);
      return false;
    }
    return true;
  }

  private mensajeError(err: any, porDefecto: string): string {
    return err?.error?.message || err?.error?.detail || porDefecto;
  }
}
