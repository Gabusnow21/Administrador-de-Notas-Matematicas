package dev.gabus.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Materia.Materia;
import dev.gabus.dto.Materia.MateriaRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/materias")
public class MateriaController {
    private final MateriaRepository materiaRepository;
    private final UsuarioRepository usuarioRepository;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    @GetMapping
    public ResponseEntity<List<Materia>> getAll() {
        Usuario user = getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(materiaRepository.findAll());
        } else {
            return ResponseEntity.ok(materiaRepository.findByProfesorId(user.getId()));
        }
    }

    @PostMapping
    public ResponseEntity<Materia> create(@RequestBody Materia materia) {
        Usuario user = getCurrentUser();
        
        if (user.getRole() != Role.ADMIN) {
            materia.setProfesor(user);
        } else {
            // Admin can assign, but if not provided, assign to self or leave null (if business logic allows)
            // Here we default to current admin if none provided, to ensure ownership
            if (materia.getProfesor() == null) {
                materia.setProfesor(user);
            }
        }
        return ResponseEntity.ok(materiaRepository.save(materia));
    }

    // Actualizar
    @PutMapping
    public ResponseEntity<Materia> update(@RequestBody Materia materia) {
        Usuario user = getCurrentUser();
        
        if (materia.getId() == null) {
             return ResponseEntity.badRequest().build();
        }

        Optional<Materia> existingOpt = materiaRepository.findById(materia.getId());
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        Materia existing = existingOpt.get();

        if (user.getRole() != Role.ADMIN) {
            // Check ownership
            if (existing.getProfesor() == null || !existing.getProfesor().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            // Prevent changing professor
            materia.setProfesor(existing.getProfesor());
        }

        return ResponseEntity.ok(materiaRepository.save(materia));
    }

    // Eliminar
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Usuario user = getCurrentUser();

        if (!materiaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        Materia materia = materiaRepository.findById(id).get();

        if (user.getRole() != Role.ADMIN) {
            // Teachers cannot delete, only Admin
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        materiaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
}
