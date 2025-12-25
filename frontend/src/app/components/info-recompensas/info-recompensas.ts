import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-info-recompensas',
  templateUrl: './info-recompensas.html',
  styleUrls: ['./info-recompensas.css']
})
export class InfoRecompensasComponent implements AfterViewInit {

  constructor() {
    // Registrar todos los componentes de Chart.js (controladores, elementos, escalas, plugins)
    Chart.register(...registerables);
  }

  ngAfterViewInit(): void {
    this.createCategoryChart();
    this.createProgressChart();
  }

  private wrapLabel(label: string): string | string[] {
    if (label.length <= 16) return label;
    const words = label.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      if ((currentLine + " " + words[i]).length <= 16) {
        currentLine += " " + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
  }

  private createCategoryChart(): void {
    const canvas = document.getElementById('categoryChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labelsCategory = ['Materiales', 'Privilegios', 'Académico', 'Experiencias'];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labelsCategory.map(l => this.wrapLabel(l)),
        datasets: [{
          label: 'Cantidad de Recompensas',
          data: [5, 5, 3, 2],
          backgroundColor: [
            'rgba(76, 175, 80, 0.7)',
            'rgba(255, 193, 7, 0.7)',
            'rgba(255, 152, 0, 0.7)',
            'rgba(244, 67, 54, 0.7)'
          ],
          borderColor: [
            '#4CAF50',
            '#FFC107',
            '#FF9800',
            '#F44336'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Número de Premios' }
          }
        }
      }
    });
  }

  private createProgressChart(): void {
    const canvas = document.getElementById('progressChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labelsProgress = ['Nivel Bronce (Inicio)', 'Nivel Plata (Medio)', 'Nivel Oro (Avanzado)', 'Nivel Épico (Final)'];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labelsProgress.map(l => this.wrapLabel(l)),
        datasets: [{
          label: 'Puntos Requeridos (Max)',
          data: [50, 150, 350, 500],
          backgroundColor: [
            'rgba(76, 175, 80, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(255, 152, 0, 0.8)',
            'rgba(244, 67, 54, 0.8)'
          ],
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            max: 550,
            title: { display: true, text: 'Puntos Acumulados' }
          }
        }
      }
    });
  }
}