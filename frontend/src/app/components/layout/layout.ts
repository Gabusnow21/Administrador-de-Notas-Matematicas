import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { SyncService } from '../../services/sync';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {
  public authService = inject(AuthService);
  public syncService = inject(SyncService);
  isDropdownOpen = false;

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    this.authService.logout();
    this.isDropdownOpen = false;
  }

  forzarSincronizacion() {
    this.syncService.sincronizar();
  }
}