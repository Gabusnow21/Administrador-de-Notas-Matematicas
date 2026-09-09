import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item toast-{{ toast.type }}"
             role="alert"
             [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'">
          <div class="toast-icon-wrapper">
            <i class="toast-icon bi"
               [ngClass]="{
                 'bi-check-circle-fill': toast.type === 'success',
                 'bi-exclamation-triangle-fill': toast.type === 'warning',
                 'bi-x-circle-fill': toast.type === 'error',
                 'bi-info-circle-fill': toast.type === 'info'
               }"></i>
          </div>
          <div class="toast-content">
            <strong class="toast-title" *ngIf="toast.title">{{ toast.title }}</strong>
            <span class="toast-message">{{ toast.message }}</span>
          </div>
          <button *ngIf="toast.dismissible" 
                  class="toast-close" 
                  (click)="toastService.dismiss(toast.id)"
                  aria-label="Cerrar notificación">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-container.css'
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
