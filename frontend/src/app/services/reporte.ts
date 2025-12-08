import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LocalDbService } from './local-db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class Reporte {
  private http = inject(HttpClient);
  private localDb = inject(LocalDbService);
  private apiUrl = 'http://localhost:8080/api/reportes';

  descargarBoletin(estudianteId: number): Observable<Blob> {
    // Intentar siempre la descarga online. Si falla, se activa el fallback a offline.
    return this.http.get(`${this.apiUrl}/boletin/${estudianteId}`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        console.warn('API de reportes no disponible. Generando boletín en modo offline.', err);
        return from(this.generarBoletinOffline(estudianteId));
      })
    );
  }

  async generarBoletinOffline(estudianteId: number): Promise<Blob> {
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
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Inicio de la Cabecera ---
    doc.setFont('sans-serif');
    doc.setFontSize(12);
    doc.text('CENTRO ESCOLAR CATÓLICO "MADRE CLARA QUIRÓS"', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFont('sans-serif', 'normal');
    doc.setFontSize(10);
    doc.text('cecmadreclaraquiros@yahoo.com', pageWidth / 2, 27, { align: 'center' });
    doc.text('Final barrio la Cruz, La Palma Chalatenango.', pageWidth / 2, 34, { align: 'center' });
    
    doc.setFont('sans-serif', 'bold');
    doc.text('Tel. 2305- 8432, 7187-7141', pageWidth / 2, 41, { align: 'center' });

    doc.setFont('sans-serif');
    doc.setFontSize(12);
    doc.text('CENTRO ESCOLAR CATÓLICO "MADRE CLARA QUIRÓS"', pageWidth / 2, 53, { align: 'center' });
    doc.text('Código: 21276', pageWidth / 2, 60, { align: 'center' });


    doc.setFontSize(11);
    doc.text('REGISTRO ACADÉMICO DE MATERIAS COMPLEMENTARIAS', pageWidth / 2, 70, { align: 'center' });
    doc.text('I, II, III CICLO', pageWidth / 2, 80, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor('#000000'); 
    doc.text(`Estudiante: ${estudiante.nombre} ${estudiante.apellido}`, 14, 95);
    doc.setTextColor('#000000'); // Reset color
    // --- Fin de la Cabecera ---

    const tableData: any[] = [];
    const materiasMap = new Map<number, any>();
  
    materias.forEach(materia => {
      if(materia.id) {
        materiasMap.set(materia.id, {
          nombre: materia.nombre,
          trimestres: { 1: { notas: [], ponderaciones: [] }, 2: { notas: [], ponderaciones: [] }, 3: { notas: [], ponderaciones: [] } }
        });
      }
    });
  
    calificaciones.forEach(cal => {
      const actividad = actividades.find(a => a.id === cal.actividadId);
      if (actividad) {
        const materia = materiasMap.get(actividad.materiaId);
        if (materia) {
          const trimestre = trimestres.find(t => t.id === actividad.trimestreId);
          if (trimestre && trimestre.id && trimestre.id <= 3) {
            materia.trimestres[trimestre.id].notas.push(cal.nota);
            materia.trimestres[trimestre.id].ponderaciones.push(actividad.ponderacion);
          }
        }
      }
    });
  
    let finalAverage = 0;
    let subjectCount = 0;
  
    materiasMap.forEach((materia, id) => {
      let t1 = this.calculateWeightedAverage(materia.trimestres[1].notas, materia.trimestres[1].ponderaciones);
      let t2 = this.calculateWeightedAverage(materia.trimestres[2].notas, materia.trimestres[2].ponderaciones);
      let t3 = this.calculateWeightedAverage(materia.trimestres[3].notas, materia.trimestres[3].ponderaciones);
  
      let total = t1 + t2 + t3;
      let promedio = total > 0 ? (total / 3).toFixed(2) : "0.00";
  
      if (total > 0) {
        finalAverage += parseFloat(promedio as string);
        subjectCount++;
      }
  
      tableData.push([materia.nombre, t1.toFixed(2), t2.toFixed(2), t3.toFixed(2), total.toFixed(2), promedio]);
    });

    autoTable(doc, {
      head: [['ASIGNATURAS', 'I TRIMESTRE', 'II TRIMESTRE', 'III TRIMESTRE', 'TOTAL', 'PROMEDIO']],
      body: tableData,
      startY: 105,
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
      columnStyles: {
        0: { halign: 'left' }, // Asignaturas
        1: { halign: 'center' }, // T1
        2: { halign: 'center' }, // T2
        3: { halign: 'center' }, // T3
        4: { halign: 'center' }, // Total
        5: { halign: 'center' }  // Promedio
      }
    });
  
    if (subjectCount > 0) {
      const overallAverage = (finalAverage / subjectCount).toFixed(2);
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.text(`Promedio Final General: ${overallAverage}`, 14, finalY + 10);
    }
  
    return doc.output('blob');
  }
  
  private calculateWeightedAverage(notas: number[], ponderaciones: number[]): number {
    if (notas.length === 0) return 0;
    let totalNota = 0;
    let totalPonderacion = 0;
    notas.forEach((nota, index) => {
      totalNota += nota * ponderaciones[index];
      totalPonderacion += ponderaciones[index];
    });
    return totalPonderacion > 0 ? totalNota / totalPonderacion : 0;
  }
}
