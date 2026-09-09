import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container" [class]="containerClass" role="alert" aria-live="assertive">
      <div class="error-icon">
        <i class="bi" [ngClass]="iconClass"></i>
      </div>
      <div class="error-content">
        <h5 class="error-title" *ngIf="title">{{ title }}</h5>
        <p class="error-message">{{ message }}</p>
        <small class="error-details" *ngIf="details">{{ details }}</small>
      </div>
      <div class="error-actions" *ngIf="showRetry || showDismiss">
        <button 
          *ngIf="showRetry" 
          class="btn btn-sm btn-outline-primary"
          (click)="onRetry.emit()"
          [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-1"></span>
          {{ loadingText }}
        </button>
        <button 
          *ngIf="showDismiss" 
          class="btn btn-sm btn-outline-secondary"
          (click)="onDismiss.emit()">
          {{ dismissText }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      margin: 1rem 0;
      background-color: var(--surface-1, #f8f9fa);
      border: 1px solid var(--danger-light, #f8d7da);
      border-radius: var(--radius-md, 8px);
      text-align: center;
    }

    .error-icon {
      font-size: 3rem;
      color: var(--danger, #dc3545);
      margin-bottom: 1rem;
    }

    .error-content {
      max-width: 400px;
    }

    .error-title {
      color: var(--text-primary, #212529);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .error-message {
      color: var(--text-secondary, #6c757d);
      margin-bottom: 0.5rem;
    }

    .error-details {
      color: var(--text-muted, #adb5bd);
      font-size: 0.875rem;
    }

    .error-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .error-actions .btn {
      min-width: 100px;
    }
  `]
})
export class ErrorDisplayComponent {
  @Input() title: string = 'Error';
  @Input() message: string = 'Ha ocurrido un error inesperado';
  @Input() details: string = '';
  @Input() showRetry: boolean = true;
  @Input() showDismiss: boolean = false;
  @Input() loading: boolean = false;
  @Input() loadingText: string = 'Reintentando...';
  @Input() dismissText: string = 'Cerrar';
  @Input() containerClass: string = '';
  @Input() iconClass: string = 'bi-exclamation-triangle-fill';

  @Output() onRetry = new EventEmitter<void>();
  @Output() onDismiss = new EventEmitter<void>();
}
