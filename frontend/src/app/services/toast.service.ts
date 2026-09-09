import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  title?: string;
  dismissible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, type: ToastType = 'info', options?: { duration?: number; title?: string; dismissible?: boolean }) {
    const id = ++this.counter;
    const duration = options?.duration ?? this.getDefaultDuration(type);
    const toast: Toast = { 
      id, 
      message, 
      type, 
      duration,
      title: options?.title,
      dismissible: options?.dismissible ?? true
    };
    this.toasts.update(list => [...list, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(message: string, options?: { duration?: number; title?: string }) {
    return this.show(message, 'success', options);
  }

  error(message: string, options?: { duration?: number; title?: string }) {
    return this.show(message, 'error', { duration: 5000, ...options });
  }

  warning(message: string, options?: { duration?: number; title?: string }) {
    return this.show(message, 'warning', { duration: 4000, ...options });
  }

  info(message: string, options?: { duration?: number; title?: string }) {
    return this.show(message, 'info', options);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  dismissAll() {
    this.toasts.set([]);
  }

  private getDefaultDuration(type: ToastType): number {
    switch (type) {
      case 'error': return 5000;
      case 'warning': return 4000;
      case 'success': return 3000;
      case 'info': return 3500;
    }
  }
}
