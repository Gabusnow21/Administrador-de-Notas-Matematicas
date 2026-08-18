import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item toast-{{ toast.type }}"
             (click)="toastService.dismiss(toast.id)">
          <i class="toast-icon bi"
             [ngClass]="{
               'bi-check-circle-fill': toast.type === 'success',
               'bi-exclamation-triangle-fill': toast.type === 'warning',
               'bi-x-circle-fill': toast.type === 'error',
               'bi-info-circle-fill': toast.type === 'info'
             }"></i>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id); $event.stopPropagation()">
            <i class="bi bi-x"></i>
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
