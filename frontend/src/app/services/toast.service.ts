import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = ++this.counter;
    const toast: Toast = { id, message, type, duration };
    this.toasts.update(list => [...list, toast]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 3500) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 4500) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4000) {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration = 3500) {
    this.show(message, 'info', duration);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
