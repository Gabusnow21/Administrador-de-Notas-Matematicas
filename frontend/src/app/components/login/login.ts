import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { UsuarioService, Usuario } from '../../services/usuario';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private usuarioService = inject(UsuarioService);

  isRegistering = false;

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  errorMessage: string = '';
  isLoading: boolean = false;

  toggleRegister(event: Event) {
    event.preventDefault();
    this.isRegistering = !this.isRegistering;
    this.errorMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        this.isLoading = false;
        this.router.navigate(['/dashboard']); 
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.isLoading = false;
        if (err.status === 403 || err.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos.';
        } else {
          this.errorMessage = 'Error de conexión con el servidor.';
        }
      }
    });
  }

  onRegister() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.registerForm.value;
    const newUser: Usuario = {
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      username: formValue.email, // Mapeo de email a username
      password: formValue.password,
      role: 'USER' // Rol por defecto
    };

    this.usuarioService.crear(newUser).subscribe({
      next: () => {
        this.isLoading = false;
        this.isRegistering = false; // Vuelve a la vista de login
        // Opcional: podrías mostrar un mensaje de éxito
        alert('Registro exitoso! Ahora puedes iniciar sesión.');
        this.loginForm.reset();
      },
      error: (err) => {
        console.error('Error de registro:', err);
        this.isLoading = false;
        if (err.status === 409) {
          this.errorMessage = 'El correo electrónico ya está en uso.';
        } else {
          this.errorMessage = 'Error al registrar el usuario.';
        }
      }
    });
  }
}
