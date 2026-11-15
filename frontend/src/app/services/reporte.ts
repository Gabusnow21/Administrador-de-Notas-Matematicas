import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { LocalDbService } from './local-db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../environments/environment';
import { BoletaData } from './ticket.service';
import { ReporteConfig, ReporteConfigService } from './reporte-config.service';
import { logoIzquierda, logoDerecha, resolverLogo } from './reporte-assets';
import {
  analizarBoleta,
  columnasVisibles,
  formatearNumero,
  textoItemConducta,
  AnalisisBoleta,
  ColumnaReporte,
} from './reporte.utils';

/** Métricas de la página usadas por los bloques del reporte. */
interface ContextoPagina {
  pageWidth: number;
  pageHeight: number;
  /** Margen lateral izquierdo (igual al histórico). */
  margenX: number;
  /** Factor de escala de fuentes: 10 pt = 1 (tamaño original). */
  escalaFuente: number;
}

@Injectable({
  providedIn: 'root',
})
export class Reporte {
  private http = inject(HttpClient);
  private localDb = inject(LocalDbService);
  private configService = inject(ReporteConfigService);
  private apiUrl = `${environment.apiUrl}`;

  /**
   * Genera el boletín de calificaciones directamente en el frontend.
   * Se eliminó el intento de descarga desde el backend para cumplir con la directiva de usar la versión del frontend.
   */
  descargarBoletin(estudianteId: number): Observable<Blob> {
    return from(this.generarBoletinOffline(estudianteId));
  }

  /**
   * Genera el reporte mensual de asistencia llamando al backend.
   */
  generarReporteAsistenciaMensual(gradoId: number, month: number, year: number): Observable<Blob> {
    const params = {
      gradoId: gradoId.toString(),
      month: month.toString(),
      year: year.toString()
    };

    return this.http.get(`${this.apiUrl}/asistencia/reporte/mensual`, {
      params,
      responseType: 'blob'
    });
  }

  async generarBoletinOffline(estudianteId: number): Promise<Blob> {
    // La plantilla se carga (o reutiliza de caché) antes de dibujar.
    const config = await this.configService.ensureLoaded();

    const estudiante = await this.localDb.estudiantes.where('id').equals(estudianteId).first();
    if (!estudiante) {
      throw new Error('Estudiante no encontrado en la base de datos local');
    }

    const allCalificaciones = await this.localDb.calificaciones.toArray();
    const calificaciones = allCalificaciones.filter(c => c.estudianteId === estudianteId);

    const allActividades = await this.localDb.actividades.toArray();
    const actividadesIds = calificaciones.map(c => c.actividadId).filter(id => id !== null);
    const actividades = allActividades.filter(a => a.id && actividadesIds.includes(a.id));

    const allMaterias = await this.localDb.materias.toArray();
    const materiasIds = actividades.map(a => a.materiaId).filter(id => id !== null);
    const materias = allMaterias.filter(m => m.id && materiasIds.includes(m.id));

    const allTrimestres = await this.localDb.trimestres.toArray();
    const trimestresIds = actividades.map(a => a.trimestreId).filter(id => id !== null);
    const trimestres = allTrimestres.filter(t => t.id && trimestresIds.includes(t.id));

    return this.generarPdfDesdeDatos(
      {
        estudiante: {
          nombres: estudiante.nombres,
          apellidos: estudiante.apellidos,
          codigoProgreso: estudiante.codigoProgreso || ''
        },
        calificaciones: calificaciones.map(c => ({ nota: Number(c.nota), actividadId: Number(c.actividadId) })),
        actividades: actividades.map(a => ({
          id: Number(a.id),
          nombre: a.nombre,
          ponderacion: Number(a.ponderacion),
          materiaId: Number(a.materiaId),
          trimestreId: Number(a.trimestreId)
        })),
        materias: materias.map(m => ({ id: Number(m.id), nombre: m.nombre })),
        trimestres: trimestres.map(t => ({ id: Number(t.id) }))
      },
      config
    );
  }

  /**
   * Genera el PDF del boletín a partir de datos en memoria y una configuración.
   * Si no se envía configuración se usa la vigente (servidor / caché local).
   *
   * Se alimenta desde IndexedDB (flujo de docentes) o desde el endpoint
   * público /api/tickets/data/{nie} (flujo de padres en descargar-boleta).
   */
  generarPdfDesdeDatos(datos: BoletaData, config?: ReporteConfig): Blob {
    const cfg = config ?? this.configService.getSnapshot();

    const orientacion = cfg.estilos.orientacion === 'landscape' ? 'landscape' : 'portrait';
    // Carta (letter) por defecto para ambas orientaciones; A4 opcional.
    const tamano = cfg.estilos.tamanoPagina === 'a4' ? 'a4' : 'letter';
    const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: tamano });

    const contexto: ContextoPagina = {
      pageWidth: doc.internal.pageSize.getWidth(),
      pageHeight: doc.internal.pageSize.getHeight(),
      margenX: 14,
      escalaFuente: (cfg.estilos.tamanoFuente || 10) / 10,
    };

    const yEstudiante = this.dibujarEncabezado(doc, cfg, datos, contexto);
    const analisis = analizarBoleta(datos, cfg);
    const yMaterias = this.dibujarTablaMaterias(doc, cfg, contexto, analisis, yEstudiante + 10);

    let yFinal = yMaterias;
    if (cfg.conducta.habilitado && cfg.conducta.bloques.some(b => (b.items?.length ?? 0) > 0)) {
      yFinal = this.dibujarSeccionConducta(doc, cfg, contexto, analisis, yMaterias);
    }

    this.dibujarPie(doc, cfg, contexto, yFinal);

    return doc.output('blob');
  }

  // ==========================================================================
  // Bloques del reporte
  // ==========================================================================

  /**
   * Logos + cabecera + datos del estudiante.
   * Devuelve la posición Y de la última línea dibujada.
   */
  private dibujarEncabezado(
    doc: jsPDF,
    cfg: ReporteConfig,
    datos: BoletaData,
    ctx: ContextoPagina
  ): number {
    const enc = cfg.encabezado;
    const escala = ctx.escalaFuente;
    const centro = ctx.pageWidth / 2;
    const margen = ctx.margenX;

    // --- Logos ---
    if (enc.mostrarLogos) {
      const tam = cfg.estilos.tamanoLogo;
      try {
        doc.addImage(resolverLogo(enc.logoIzquierda, logoIzquierda), 'PNG', 15, 14, tam, tam);
        doc.addImage(resolverLogo(enc.logoDerecha, logoDerecha), 'PNG', ctx.pageWidth - 15 - tam, 13, tam, tam);
      } catch {
        // Logo inválido o no soportado: se omite sin romper el reporte.
      }
    }

    // Ancho disponible para el bloque superior sin chocar con los logos.
    const anchoSuperior = enc.mostrarLogos
      ? Math.max(60, ctx.pageWidth - 2 * (15 + cfg.estilos.tamanoLogo) - 6)
      : ctx.pageWidth - 2 * margen;
    const anchoTotal = ctx.pageWidth - 2 * margen;

    // --- Nombre del centro (línea superior) ---
    doc.setFont('sans-serif', 'bold');
    doc.setFontSize(12 * escala);
    let y = 20;
    y = this.dibujarCentrado(doc, enc.institucion, centro, y, anchoSuperior, 5);

    // --- Bloque de contacto ---
    if (enc.mostrarContacto) {
      for (const linea of enc.lineasContacto ?? []) {
        if (!linea.texto?.trim()) continue;
        doc.setFont('sans-serif', linea.negrita ? 'bold' : 'normal');
        doc.setFontSize(10 * escala);
        y = this.dibujarCentrado(doc, linea.texto, centro, y + 5, anchoSuperior, 5);
      }
    }

    // --- Nombre del centro en serif + código ---
    doc.setFont('serif', 'bold');
    doc.setFontSize(16 * escala);
    y = this.dibujarCentrado(doc, enc.institucion, centro, y + 10, anchoTotal, 6) + 5;

    if (enc.mostrarCodigo && enc.codigo) {
      doc.text(`Código:${enc.codigo}`, centro, y, { align: 'center' });
      y += 5;
    }

    // --- Título y subtítulo ---
    doc.setFontSize(12 * escala);
    y = this.dibujarCentrado(doc, enc.titulo, centro, y + (enc.mostrarCodigo ? 15 : 20), anchoTotal, 5);
    y = this.dibujarCentrado(doc, enc.subtitulo, centro, y + 10, anchoTotal, 5);

    // --- Datos del estudiante ---
    doc.setFontSize(11 * escala);
    doc.setTextColor(cfg.estilos.colorPrimario);
    y += 15;

    const est = datos.estudiante;
    if (cfg.estudiante.mostrarNombre) {
      doc.text(`Estudiante:  ${est.apellidos} ${est.nombres}`, margen, y);
    }
    if (cfg.estudiante.mostrarCodigo) {
      const textoNie = `${cfg.estudiante.etiquetaCodigo}: ${est.codigoProgreso || ''}`;
      doc.text(textoNie, ctx.pageWidth - margen - doc.getTextWidth(textoNie), y);
    }
    doc.setTextColor('#000000');

    return y;
  }

  /** Dibuja un texto centrado y con saltos de línea. Devuelve la Y de la última línea. */
  private dibujarCentrado(
    doc: jsPDF,
    texto: string,
    x: number,
    y: number,
    ancho: number,
    altoLinea: number
  ): number {
    const lineas: string[] = doc.splitTextToSize(texto ?? '', ancho);
    lineas.forEach((linea, index) => {
      doc.text(linea, x, y + index * altoLinea, { align: 'center' });
    });
    return y + (lineas.length - 1) * altoLinea;
  }

  /** Tabla de asignaturas con las columnas configuradas. Devuelve la Y final. */
  private dibujarTablaMaterias(
    doc: jsPDF,
    cfg: ReporteConfig,
    ctx: ContextoPagina,
    analisis: AnalisisBoleta,
    startY: number
  ): number {
    const columnas: ColumnaReporte[] = columnasVisibles(cfg);
    const decimales = cfg.materias.decimales;
    const decimalesPromedio = cfg.materias.decimalesPromedio;

    const cuerpo: string[][] = analisis.materias
      .filter(m => cfg.materias.mostrarMateriasSinNotas || !m.sinNotas)
      .map(m => {
        const valores: Record<string, string> = {
          t1: formatearNumero(m.trimestres[0], decimales),
          t2: formatearNumero(m.trimestres[1], decimales),
          t3: formatearNumero(m.trimestres[2], decimales),
          total: formatearNumero(m.total, decimales),
          promedio: formatearNumero(m.promedio, decimalesPromedio),
          materia: m.nombre,
        };
        return columnas.map(c => valores[c.clave]);
      });

    const estilosColumnas: Record<number, { halign: 'left' | 'center' }> = {};
    columnas.forEach((columna, indice) => {
      estilosColumnas[indice] = { halign: indice === 0 ? 'left' : 'center' };
    });

    autoTable(doc, {
      head: [columnas.map(c => c.etiqueta)],
      body: cuerpo,
      startY,
      headStyles: {
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255]
      },
      bodyStyles: {
        fontStyle: 'bold',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: [0, 0, 0]
      },
      columnStyles: estilosColumnas
    });

    return this.ultimaY(doc);
  }

  /** Bloque de conducta (títulos + bloques + ítems). Devuelve la Y final. */
  private dibujarSeccionConducta(
    doc: jsPDF,
    cfg: ReporteConfig,
    ctx: ContextoPagina,
    analisis: AnalisisBoleta,
    yMaterias: number
  ): number {
    const escala = ctx.escalaFuente;
    const centro = ctx.pageWidth / 2;
    const ancho = ctx.pageWidth - 2 * ctx.margenX;

    // Título y subtítulo del bloque de conducta.
    doc.setFont('serif', 'bold');
    doc.setFontSize(12 * escala);
    this.dibujarCentrado(doc, cfg.conducta.titulo, centro, yMaterias + 10, ancho, 5);
    doc.setFontSize(10 * escala);
    this.dibujarCentrado(doc, cfg.conducta.subtitulo, centro, yMaterias + 15, ancho, 5);

    // Columnas de trimestre visibles (reutiliza las etiquetas cortas).
    const columnasTrimestre = (cfg.materias.columnas.trimestres ?? [])
      .map((columna, indice) => ({ columna, indice }))
      .filter(item => item.columna.visible);

    const filas: any[][] = [];
    for (const bloque of cfg.conducta.bloques) {
      const items = bloque.items ?? [];
      if (items.length === 0) continue;

      filas.push([
        {
          content: bloque.titulo,
          styles: { fontStyle: 'bold' as const, lineWidth: { top: 0.1, right: 0.1, bottom: 0, left: 0.1 } },
        },
        ...columnasTrimestre.map(item => ({
          content: item.columna.etiquetaCorta,
          styles: { halign: 'center' as const, fontStyle: 'bold' as const },
        })),
      ]);

      items.forEach((item, indice) => {
        const estado = analisis.conducta.get(item.numero);
        const esUltimo = indice === items.length - 1;
        filas.push([
          {
            content: textoItemConducta(item.numero, item.texto),
            styles: {
              lineWidth: { top: 0, right: 0.1, bottom: esUltimo ? 0.1 : 0, left: 0.1 },
            },
          },
          ...columnasTrimestre.map(columna =>
            estado && estado[columna.indice] === true ? '✅' : ''
          ),
        ]);
      });
    }

    if (filas.length === 0) {
      return yMaterias;
    }

    const estilosColumnas: Record<number, any> = { 0: { cellWidth: 'auto' } };
    columnasTrimestre.forEach((_item, posicion) => {
      estilosColumnas[posicion + 1] = { cellWidth: 25, halign: 'center' };
    });

    autoTable(doc, {
      body: filas,
      startY: yMaterias + 20,
      theme: 'grid',
      styles: {
        fontSize: 7 * escala,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: estilosColumnas,
      didDrawCell: data => {
        // Columnas de trimestre (todas menos la de descripción).
        if (data.section === 'body' && data.column.index >= 1) {
          const texto = data.cell.text[0];
          if (texto === '✅') {
            const x = data.cell.x + data.cell.width / 2;
            const y = data.cell.y + data.cell.height / 2;
            doc.setDrawColor(0, 128, 0); // Verde
            doc.setLineWidth(0.4);
            doc.line(x - 2, y, x - 0.5, y + 2);
            doc.line(x - 0.5, y + 2, x + 2.5, y - 2);
            data.cell.text = ['']; // Evita el emoji roto
          }
        }
      }
    });

    return this.ultimaY(doc);
  }

  /** Texto final del reporte, con salto de página si no cabe. */
  private dibujarPie(doc: jsPDF, cfg: ReporteConfig, ctx: ContextoPagina, desdeY: number): void {
    if (!cfg.pie.habilitado || !cfg.pie.texto?.trim()) return;

    doc.setFont('sans-serif', 'normal');
    doc.setFontSize(10 * ctx.escalaFuente);

    const ancho = ctx.pageWidth - 2 * ctx.margenX;
    const lineas: string[] = doc.splitTextToSize(cfg.pie.texto, ancho);
    const altoLinea = 5;

    // Prioriza el pie al pie de la página (como el reporte original),
    // pero nunca encima de la última tabla.
    let y = Math.max(desdeY + 15, ctx.pageHeight - 17);

    if (y + (lineas.length - 1) * altoLinea > ctx.pageHeight - 5) {
      doc.addPage();
      y = 20;
    }

    lineas.forEach((linea, index) => {
      doc.text(linea, ctx.pageWidth / 2, y + index * altoLinea, { align: 'center' });
    });
  }

  /** Última coordenada Y dibujada por autoTable. */
  private ultimaY(doc: jsPDF): number {
    return (doc as any).lastAutoTable?.finalY ?? 0;
  }
}
