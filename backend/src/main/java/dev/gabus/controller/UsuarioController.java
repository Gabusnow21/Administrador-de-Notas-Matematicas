package dev.gabus.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.auth.RegisterRequest;
import dev.gabus.dto.Administracion.UsuarioDesactivadoDTO;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import dev.gabus.service.BajaLogicaService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {
    
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final BajaLogicaService bajaLogicaService;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    // 1. Listar todos los usuarios activos
    @GetMapping
    public ResponseEntity<List<Usuario>> getAll() {
        return ResponseEntity.ok(usuarioRepository.findByActivoTrue());
    }

    @GetMapping("/teachers")
    public ResponseEntity<List<Usuario>> getTeachers() {
        return ResponseEntity.ok(usuarioRepository.findByRoleAndActivoTrue(Role.USER));
    }

    @GetMapping("/inactivos")
    public ResponseEntity<List<UsuarioDesactivadoDTO>> getInactivos() {
        return ResponseEntity.ok(bajaLogicaService.listarProfesoresDesactivados(getCurrentUser()));
    }

    // 2. Crear un usuario nuevo (Desde el panel de Admin)
    @PostMapping
    public ResponseEntity<?> create(@RequestBody RegisterRequest request) {
        // 1. Verificar si ya existe
        var existente = usuarioRepository.findByUsername(request.getUsername());
        
        if (existente.isPresent()) {
            // Si el usuario fue desactivado, no se reutiliza el correo: debe restaurarse.
            if (!existente.get().isActivo()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Existe un usuario desactivado con ese correo. Restáurelo o use otro correo."));
            }
            // ESTRATEGIA DE SYNC: Si ya existe, lo devolvemos como si lo acabáramos de crear.
            // Esto permite que el frontend actualice su ID local y marque como 'synced'.
            return ResponseEntity.ok(existente.get());
        }

        // 2. Si no existe, lo creamos
        var user = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : Role.USER)
                .build();
        
        return ResponseEntity.ok(usuarioRepository.save(user));
    }

    // 3. Desactivar usuario (borrado lógico, solo ADMIN)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bajaLogicaService.desactivarProfesor(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    // 4. Restaurar usuario desactivado (solo ADMIN)
    @PatchMapping("/{id}/restaurar")
    public ResponseEntity<Usuario> restaurar(@PathVariable Long id) {
        return ResponseEntity.ok(bajaLogicaService.restaurarProfesor(id, getCurrentUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody RegisterRequest request) {
        return usuarioRepository.findByIdAndActivoTrue(id).map(usuario -> {
            
            usuario.setNombre(request.getNombre());
            usuario.setApellido(request.getApellido());
            usuario.setUsername(request.getUsername());
            
            // Actualizar Rol
            if (request.getRole() != null) {
                usuario.setRole(request.getRole());
            }

            // Actualizar Password SOLO si viene texto (no vacío)
            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                usuario.setPassword(passwordEncoder.encode(request.getPassword()));
            }

            return ResponseEntity.ok(usuarioRepository.save(usuario));
        }).orElse(ResponseEntity.notFound().build());
    }
    
}
