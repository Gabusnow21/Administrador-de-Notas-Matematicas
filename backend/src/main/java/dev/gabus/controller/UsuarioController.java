package dev.gabus.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.auth.RegisterRequest;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {
    
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    // 1. Listar todos los usuarios
    @GetMapping
    public ResponseEntity<List<Usuario>> getAll() {
        return ResponseEntity.ok(usuarioRepository.findAll());
    }

    // 2. Crear un usuario nuevo (Desde el panel de Admin)
    @PostMapping
    public ResponseEntity<?> create(@RequestBody RegisterRequest request) {
        // 1. Verificar si ya existe
        var existente = usuarioRepository.findByUsername(request.getUsername());
        
        if (existente.isPresent()) {
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

    // 3. Eliminar usuario
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!usuarioRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        usuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
}
