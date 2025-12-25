import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  template: `
    <app-sidebar #sidebar></app-sidebar>
    <div class="main-content-wrapper" [class.expanded]="sidebar.isExpanded">
      <nav class="navbar navbar-dark bg-primary shadow sticky-top">
        <div class="container-fluid">
          <div class="d-flex align-items-center">
            <button class="btn btn-link text-white me-3 p-0 border-0" (click)="sidebar.toggle()">
              <i class="bi bi-list fs-2"></i>
            </button>
            <span class="navbar-brand mb-0 h1 fw-bold">Administrador de Notas Matemáticas</span>
          </div>
          <div class="d-flex align-items-center text-white">
             <span class="me-3 d-none d-md-inline fw-semibold">Bienvenido</span>
             <i class="bi bi-person-circle fs-3"></i>
          </div>
        </div>
      </nav>
      <main class="p-4">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .main-content-wrapper {
      transition: margin-left 0.3s ease;
      margin-left: 80px; /* Collapsed width */
      min-height: 100vh;
      background-color: #f8f9fa;
    }

    .main-content-wrapper.expanded {
      margin-left: 250px; /* Expanded width */
    }

    .navbar {
      height: 64px;
      padding: 0 1.5rem;
    }

    .navbar-brand {
      font-size: 1.25rem;
      letter-spacing: 0.5px;
    }
  `]
})
export class LayoutComponent {}
