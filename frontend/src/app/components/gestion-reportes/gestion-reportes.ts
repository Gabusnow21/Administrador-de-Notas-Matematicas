import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  CONFIGURACION_REPORTE_POR_DEFECTO,
  LOGO_MAX_BYTES,
  LOGO_MAX_PX,
  BloqueConducta,
  ReporteConfig,
  ReporteConfigService,
  clonarConfig,
  validarConfig,
} from '../../services/reporte-config.service';
import { Reporte } from '../../services/reporte';
import { logoDerecha, logoIzquierda } from '../../services/reporte-assets';
import { ToastService } from '../../services/toast.service';
import { BoletaData } from '../../services/ticket.service';

type Pestana = 'encabezado' | 'estudiante' | 'materias' | 'conducta' | 'avanzado' | 'vista-previa';
type LadoLogo = 'logoIzquierda' | 'logoDerecha';

interface EntradaPestana {
  id: Pestana;
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-gestion-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-reportes.html',
  styleUrl: './gestion-reportes.css',
})
export class GestionReportes implements OnInit, OnDestroy {
  private configService = inject(ReporteConfigService);
  private reporteService = inject(Reporte);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  readonly LOGO_MAX_PX = LOGO_MAX_PX;
  readonly LOGO_MAX_BYTES = LOGO_MAX_BYTES;
  readonly lados: LadoLogo[] = ['logoIzquierda', 'logoDerecha'];
  readonly logoDefectoIzquierdo = logoIzquierda;
  readonly logoDefectoDerecho = logoDerecha;
  readonly pestanas: EntradaPestana[] = [
    { id: 'encabezado', etiqueta: 'Encabezado', icono: 'bi-building' },
    { id: 'estudiante', etiqueta: 'Estudiante', icono: 'bi-person-badge' },
    { id: 'materias', etiqueta: 'Materias', icono: 'bi-table' },
    { id: 'conducta', etiqueta: 'Conducta', icono: 'bi-clipboard-check' },
    { id: 'avanzado', etiqueta: 'Pie y avanzado', icono: 'bi-sliders' },
    { id: 'vista-previa', etiqueta: 'Vista previa', icono: 'bi-eye' },
  ];

  pestana: Pestana = 'encabezado';
  borrador: ReporteConfig = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);

  cargando = true;
  guardando = false;
  sucio = false;
  procesandoLogo = false;
  errores: string[] = [];

  previewUrl: string | null = null;
  previewSafe: SafeResourceUrl | null = null;
  actualizandoPreview = false;

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.liberarPreview();
  }

  // ------------------------------------------------------------------
  // Carga y guardado
  // ------------------------------------------------------------------

  async cargar(): Promise<void> {
    this.cargando = true;
    const config = await this.configService.ensureLoaded();
    this.borrador = clonarConfig(config);
    this.sucio = false;
    this.errores = [];
    this.cargando = false;

    if (this.pestana === 'vista-previa') {
      this.actualizarPreview();
    }
  }

  guardar(): void {
    const errores = validarConfig(this.borrador);
    this.errores = errores;
    if (errores.length > 0) {
      this.toast.error('Corrige los errores de la configuración antes de guardar.');
      return;
    }

    this.guardando = true;
    this.configService.guardar(this.borrador).subscribe({
      next: () => {
        this.guardando = false;
        this.sucio = false;
        this.toast.success('Configuración del reporte guardada.');
      },
      error: (err: unknown) => {
        this.guardando = false;
        const mensaje = err instanceof Error ? err.message : 'No se pudo guardar la configuración.';
        this.toast.error(mensaje);
      },
    });
  }

  restaurarPorDefecto(): void {
    if (!confirm('¿Restaurar la configuración original del reporte? Los cambios no guardados se perderán.')) {
      return;
    }
    this.borrador = clonarConfig(CONFIGURACION_REPORTE_POR_DEFECTO);
    this.sucio = true;
    this.errores = [];
    this.toast.info('Se restauraron los valores por defecto. Guarda para aplicarlos.');
    if (this.pestana === 'vista-previa') {
      this.actualizarPreview();
    }
  }

  recargarDelServidor(): void {
    if (this.sucio && !confirm('Tienes cambios sin guardar. ¿Descartarlos y recargar del servidor?')) {
      return;
    }
    this.configService.recargar().then(config => {
      this.borrador = clonarConfig(config);
      this.sucio = false;
      this.errores = [];
      this.toast.info('Configuración recargada desde el servidor.');
      if (this.pestana === 'vista-previa') {
        this.actualizarPreview();
      }
    });
  }

  marcarSucio(): void {
    this.sucio = true;
  }

  seleccionarPestana(id: Pestana): void {
    this.pestana = id;
    if (id === 'vista-previa') {
      this.actualizarPreview();
    }
  }

  // ------------------------------------------------------------------
  // Logos personalizados (límite de píxeles y peso)
  // ------------------------------------------------------------------

  subirLogo(event: Event, lado: LadoLogo): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';

    if (!archivo) return;

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type)) {
      this.toast.error('Formato no soportado. Usa PNG, JPG o WEBP.');
      return;
    }

    if (archivo.size > LOGO_MAX_BYTES) {
      this.toast.error(`La imagen supera el máximo de ${Math.round(LOGO_MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }

    this.procesandoLogo = true;
    const lector = new FileReader();
    lector.onload = () => this.procesarImagen(String(lector.result), lado);
    lector.onerror = () => {
      this.procesandoLogo = false;
      this.toast.error('No se pudo leer la imagen.');
    };
    lector.readAsDataURL(archivo);
  }

  private procesarImagen(dataUrl: string, lado: LadoLogo): void {
    const imagen = new Image();
    imagen.onload = () => {
      try {
        let { width, height } = imagen;
        if (width > LOGO_MAX_PX || height > LOGO_MAX_PX) {
          const escala = Math.min(LOGO_MAX_PX / width, LOGO_MAX_PX / height);
          width = Math.max(1, Math.round(width * escala));
          height = Math.max(1, Math.round(height * escala));
        }

        const lienzo = document.createElement('canvas');
        lienzo.width = width;
        lienzo.height = height;
        const contexto = lienzo.getContext('2d');
        if (!contexto) {
          this.toast.error('No se pudo procesar la imagen en este navegador.');
          return;
        }

        contexto.drawImage(imagen, 0, 0, width, height);
        const salida = lienzo.toDataURL('image/png');

        this.borrador.encabezado[lado] = salida;
        this.marcarSucio();
        this.toast.success(`Logo actualizado (${width}×${height} px).`);
      } finally {
        this.procesandoLogo = false;
      }
    };
    imagen.onerror = () => {
      this.procesandoLogo = false;
      this.toast.error('La imagen no es válida.');
    };
    imagen.src = dataUrl;
  }

  limpiarLogo(lado: LadoLogo): void {
    this.borrador.encabezado[lado] = null;
    this.marcarSucio();
    this.toast.info('Se restauró el logo por defecto.');
  }

  esLogoPersonalizado(lado: LadoLogo): boolean {
    return !!this.borrador.encabezado[lado];
  }

  // ------------------------------------------------------------------
  // Encabezado: líneas de contacto
  // ------------------------------------------------------------------

  agregarLineaContacto(): void {
    this.borrador.encabezado.lineasContacto.push({ texto: '', negrita: false });
    this.marcarSucio();
  }

  eliminarLineaContacto(indice: number): void {
    this.borrador.encabezado.lineasContacto.splice(indice, 1);
    this.marcarSucio();
  }

  moverLineaContacto(indice: number, delta: number): void {
    const lista = this.borrador.encabezado.lineasContacto;
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    const [linea] = lista.splice(indice, 1);
    lista.splice(destino, 0, linea);
    this.marcarSucio();
  }

  // ------------------------------------------------------------------
  // Conducta: bloques e ítems
  // ------------------------------------------------------------------

  agregarBloque(): void {
    this.borrador.conducta.bloques.push({
      id: `bloque-${Date.now()}`,
      titulo: 'NUEVO BLOQUE',
      items: [],
    });
    this.marcarSucio();
  }

  eliminarBloque(indice: number): void {
    const bloque = this.borrador.conducta.bloques[indice];
    if (!confirm(`¿Eliminar el bloque "${bloque.titulo}" y sus ${bloque.items.length} ítems?`)) return;
    this.borrador.conducta.bloques.splice(indice, 1);
    this.marcarSucio();
  }

  agregarItem(bloque: BloqueConducta): void {
    bloque.items.push({ numero: this.proximoNumeroItem(), texto: 'Nuevo aspecto a evaluar.' });
    this.marcarSucio();
  }

  eliminarItem(bloque: BloqueConducta, indice: number): void {
    bloque.items.splice(indice, 1);
    this.marcarSucio();
  }

  moverItem(bloque: BloqueConducta, indice: number, delta: number): void {
    const destino = indice + delta;
    if (destino < 0 || destino >= bloque.items.length) return;
    const [item] = bloque.items.splice(indice, 1);
    bloque.items.splice(destino, 0, item);
    this.marcarSucio();
  }

  /** Siguiente número libre para un ítem de conducta. */
  proximoNumeroItem(): number {
    const usados = this.borrador.conducta.bloques.flatMap(b => b.items.map(i => i.numero));
    return usados.length === 0 ? 1 : Math.max(...usados) + 1;
  }

  get numerosDuplicados(): number[] {
    const usados = this.borrador.conducta.bloques.flatMap(b => b.items.map(i => i.numero));
    const repetidos = usados.filter((n, i) => usados.indexOf(n) !== i);
    return Array.from(new Set(repetidos));
  }

  // ------------------------------------------------------------------
  // Vista previa
  // ------------------------------------------------------------------

  get orientacionPrevia(): 'portrait' | 'landscape' {
    return this.borrador.estilos.orientacion;
  }

  get aspectoPrevia(): string {
    return this.orientacionPrevia === 'landscape' ? '297 / 210' : '210 / 297';
  }

  actualizarPreview(): void {
    this.actualizandoPreview = true;
    try {
      const blob = this.reporteService.generarPdfDesdeDatos(this.datosDeMuestra(), clonarConfig(this.borrador));
      this.liberarPreview();
      this.previewUrl = URL.createObjectURL(blob);
      this.previewSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
    } catch (error) {
      console.error('Error generando la vista previa', error);
      this.toast.error('No se pudo generar la vista previa.');
    } finally {
      this.actualizandoPreview = false;
    }
  }

  descargarPreview(): void {
    if (!this.previewUrl) {
      this.actualizarPreview();
    }
    const url = this.previewUrl;
    if (!url) return;
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'boleta_vista_previa.pdf';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }

  private liberarPreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    this.previewSafe = null;
  }

  /** Datos de muestra para la vista previa (materias + conducta). */
  private datosDeMuestra(): BoletaData {
    const materias = [
      { id: 1, nombre: 'Matemáticas' },
      { id: 2, nombre: 'Lenguaje y Comunicación' },
      { id: 3, nombre: 'Ciencias Naturales' },
      { id: 4, nombre: 'Estudios Sociales' },
    ];
    const trimestres = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const actividades: BoletaData['actividades'] = [];
    const calificaciones: BoletaData['calificaciones'] = [];
    let id = 1;

    for (const materia of materias) {
      for (const trimestre of [1, 2, 3]) {
        actividades.push({
          id,
          nombre: `Examen de ${materia.nombre} (T${trimestre})`,
          ponderacion: 10,
          materiaId: materia.id,
          trimestreId: trimestre,
        });
        calificaciones.push({ nota: 6 + ((materia.id + trimestre) % 5), actividadId: id });
        id++;
      }
    }

    for (let numero = 1; numero <= 15; numero++) {
      for (const trimestre of [1, 2, 3]) {
        actividades.push({
          id,
          nombre: `${numero}. Aspecto de conducta de muestra`,
          ponderacion: 5,
          materiaId: 1,
          trimestreId: trimestre,
        });
        calificaciones.push({ nota: numero % 4 === 0 ? 3 : 10, actividadId: id });
        id++;
      }
    }

    return {
      estudiante: {
        nombres: 'María Fernanda',
        apellidos: 'Rodríguez López',
        codigoProgreso: '20241234',
      },
      calificaciones,
      actividades,
      materias,
      trimestres,
    };
  }
}
