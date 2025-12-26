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
          label: 'Cantidad',
          data: [5, 5, 3, 2],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)', // Emerald 500
            'rgba(79, 70, 229, 0.8)',  // Indigo 600
            'rgba(245, 158, 11, 0.8)', // Amber 500
            'rgba(168, 85, 247, 0.8)'  // Purple 500
          ],
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { family: 'Outfit', size: 14 },
            bodyFont: { family: 'Outfit', size: 13 },
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { display: false },
            ticks: {
              font: { family: 'Outfit', size: 12 },
              stepSize: 1
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Outfit', size: 12 }
            }
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

    const labelsProgress = ['Bronce', 'Plata', 'Oro', 'Épico'];

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labelsProgress,
        datasets: [{
          label: 'Puntos Requeridos',
          data: [50, 150, 350, 500],
          backgroundColor: [
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#a855f7'  // Purple
          ],
          borderRadius: 8,
          barThickness: 24
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { family: 'Outfit', size: 14 },
            bodyFont: { family: 'Outfit', size: 13 },
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            max: 550,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'Outfit', size: 12 }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: 'Outfit', size: 12, weight: 'bold' }
            }
          }
        }
      }
    });
  }
}