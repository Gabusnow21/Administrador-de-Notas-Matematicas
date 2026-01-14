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

import dev.gabus.dto.Grado.Grado;
import dev.gabus.dto.Grado.GradoRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/grados")
@RequiredArgsConstructor
public class GradoController {

    private final GradoRepository gradoRepository;
    private final UsuarioRepository usuarioRepository;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    // Obtener todos los grados
    @GetMapping
    public ResponseEntity<List<Grado>> getAllGrados() {
        Usuario user = getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(gradoRepository.findAll());
        } else {
            return ResponseEntity.ok(gradoRepository.findByProfesorId(user.getId()));
        }
    }

    //Obtener grado por ID
    @GetMapping("/{id}")
    public ResponseEntity<Grado> getGradoById(@PathVariable Long id) {
        Optional<Grado> gradoOpt = gradoRepository.findById(id);
        if (gradoOpt.isEmpty()) return ResponseEntity.notFound().build();

        Grado grado = gradoOpt.get();
        Usuario user = getCurrentUser();

        if (user.getRole() != Role.ADMIN) {
            if (grado.getProfesor() == null || !grado.getProfesor().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(grado);
    }

    // Crear un nuevo grado
    @PostMapping
    public ResponseEntity<Grado> createGrado(@RequestBody Grado grado) {
        Usuario user = getCurrentUser();
        
        if (user.getRole() != Role.ADMIN) {
            grado.setProfesor(user);
        } else {
            // ADMIN MUST assign a teacher.
            if (grado.getProfesor() == null || grado.getProfesor().getId() == null) {
                return ResponseEntity.badRequest().build(); // Or return a more descriptive error
            }
        }
        return ResponseEntity.ok(gradoRepository.save(grado));
    }

    //Actualizar grado
    @PutMapping
    public ResponseEntity<Grado> updateGrado(@RequestBody Grado grado) {
        Usuario user = getCurrentUser();

        if (grado.getId() == null) {
             return ResponseEntity.badRequest().build();
        }

        Optional<Grado> existingOpt = gradoRepository.findById(grado.getId());
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        Grado existing = existingOpt.get();

        if (user.getRole() != Role.ADMIN) {
            // Check ownership
            if (existing.getProfesor() == null || !existing.getProfesor().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            // Prevent changing professor
            grado.setProfesor(existing.getProfesor());
        }
        
        return ResponseEntity.ok(gradoRepository.save(grado)); 
    }

    
    // (Opcional) Borrar grado
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGrado(@PathVariable Long id) {
        Usuario user = getCurrentUser();
        
        if (!gradoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        Grado grado = gradoRepository.findById(id).get();

        if (user.getRole() != Role.ADMIN) {
             if (grado.getProfesor() == null || !grado.getProfesor().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
             }
        }

        gradoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}