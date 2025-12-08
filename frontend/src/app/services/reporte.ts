import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { LocalDbService } from './local-db';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class Reporte {
  private http = inject(HttpClient);
  private localDb = inject(LocalDbService);
  private apiUrl = 'http://localhost:8080/api/reportes';

  descargarBoletin(estudianteId: number): Observable<Blob> {
    if (navigator.onLine) {
      return this.http.get(`${this.apiUrl}/boletin/${estudianteId}`, {
        responseType: 'blob'
      });
    } else {
      return new Observable(observer => {
        this.generarBoletinOffline(estudianteId).then(blob => {
          observer.next(blob);
          observer.complete();
        }).catch(err => {
          observer.error(err);
        });
      });
    }
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
    doc.text(`Boletín de Calificaciones`, 14, 20);
    doc.text(`Estudiante: ${estudiante.nombre} ${estudiante.apellido}`, 14, 30);
  
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
  
    (doc as any).autoTable({
      head: [['Materia', 'Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Total', 'Promedio']],
      body: tableData,
      startY: 40
    });
  
    if (subjectCount > 0) {
      const overallAverage = (finalAverage / subjectCount).toFixed(2);
      doc.text(`Promedio Final General: ${overallAverage}`, 14, (doc as any).autoTable.previous.finalY + 10);
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
