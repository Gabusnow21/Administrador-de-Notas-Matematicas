import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper" [class]="wrapperClass">
      @if (type === 'text') {
        <div class="skeleton-text" [style.width]="width" [style.height]="height"></div>
      } @else if (type === 'circle') {
        <div class="skeleton-circle" [style.width]="width" [style.height]="width"></div>
      } @else if (type === 'card') {
        <div class="skeleton-card">
          <div class="skeleton-card-img"></div>
          <div class="skeleton-card-body">
            <div class="skeleton-text" style="width: 60%; height: 20px;"></div>
            <div class="skeleton-text" style="width: 100%; height: 14px; margin-top: 8px;"></div>
            <div class="skeleton-text" style="width: 80%; height: 14px; margin-top: 4px;"></div>
          </div>
        </div>
      } @else if (type === 'table') {
        <div class="skeleton-table">
          @for (row of getRows(rows); track row) {
            <div class="skeleton-row">
              @for (col of getRows(cols); track col) {
                <div class="skeleton-cell" [style.width]="colWidth"></div>
              }
            </div>
          }
        </div>
      } @else if (type === 'avatar') {
        <div class="skeleton-avatar" [style.width]="width" [style.height]="height"></div>
      } @else {
        <div class="skeleton-block" [style.width]="width" [style.height]="height"></div>
      }
    </div>
  `,
  styles: [`
    .skeleton-wrapper {
      display: contents;
    }

    .skeleton-text,
    .skeleton-circle,
    .skeleton-block,
    .skeleton-cell,
    .skeleton-avatar {
      background: linear-gradient(90deg, var(--surface-2, #e9ecef) 25%, var(--surface-3, #dee2e6) 50%, var(--surface-2, #e9ecef) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
      border-radius: var(--radius-sm, 4px);
    }

    .skeleton-circle {
      border-radius: 50%;
    }

    .skeleton-card {
      border: 1px solid var(--border-color, #dee2e6);
      border-radius: var(--radius-md, 8px);
      overflow: hidden;
    }

    .skeleton-card-img {
      height: 160px;
      background: linear-gradient(90deg, var(--surface-2, #e9ecef) 25%, var(--surface-3, #dee2e6) 50%, var(--surface-2, #e9ecef) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }

    .skeleton-card-body {
      padding: 1rem;
    }

    .skeleton-table {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skeleton-row {
      display: flex;
      gap: 1rem;
    }

    .skeleton-cell {
      flex: 1;
      height: 40px;
    }

    .skeleton-avatar {
      border-radius: 50%;
    }

    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class SkeletonComponent {
  @Input() type: 'text' | 'circle' | 'card' | 'table' | 'block' | 'avatar' = 'block';
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() rows: number = 5;
  @Input() cols: number = 4;
  @Input() wrapperClass: string = '';

  get colWidth(): string {
    return `${100 / this.cols}%`;
  }

  getRows(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }
}
