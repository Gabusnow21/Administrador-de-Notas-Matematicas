package dev.gabus.controller;

import dev.gabus.dto.Recompensa.Recompensa;
import dev.gabus.dto.Recompensa.RecompensaRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recompensas")
public class RecompensaController {

    @Autowired
    private RecompensaRepository recompensaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    // Obtener todas las recompensas
    @GetMapping
    public ResponseEntity<List<Recompensa>> getAllRecompensas() {
        Usuario user = getCurrentUser();
        if (user.getRole() == Role.ADMIN) {
             return ResponseEntity.ok(recompensaRepository.findAll());
        } else {
             return ResponseEntity.ok(recompensaRepository.findByProfesorId(user.getId()));
        }
    }

    // Crear una nueva recompensa
    @PostMapping
    public ResponseEntity<Recompensa> createRecompensa(@RequestBody Recompensa recompensa) {
        Usuario user = getCurrentUser();
        
        if (user.getRole() != Role.ADMIN) {
            recompensa.setProfesor(user);
        } else {
            if (recompensa.getProfesor() == null) {
                recompensa.setProfesor(user);
            }
        }
        return ResponseEntity.ok(recompensaRepository.save(recompensa));
    }

    // Actualizar una recompensa
    @PutMapping("/{id}")
    public ResponseEntity<Recompensa> updateRecompensa(@PathVariable Long id, @RequestBody Recompensa recompensaDetails) {
        Usuario user = getCurrentUser();

        return recompensaRepository.findById(id)
                .map(recompensa -> {
                    
                    if (user.getRole() != Role.ADMIN) {
                        if (recompensa.getProfesor() == null || !recompensa.getProfesor().getId().equals(user.getId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                        }
                    }

                    recompensa.setNombre(recompensaDetails.getNombre());
                    recompensa.setDescripcion(recompensaDetails.getDescripcion());
                    recompensa.setCosto(recompensaDetails.getCosto());
                    recompensa.setStock(recompensaDetails.getStock());
                    recompensa.setImagenUrl(recompensaDetails.getImagenUrl());
                    Recompensa updatedRecompensa = recompensaRepository.save(recompensa);
                    return ResponseEntity.ok(updatedRecompensa);
                }).orElse(ResponseEntity.notFound().build());
    }

    // Borrar una recompensa
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecompensa(@PathVariable Long id) {
        Usuario user = getCurrentUser();

        return recompensaRepository.findById(id)
                .map(recompensa -> {
                    if (user.getRole() != Role.ADMIN) {
                        if (recompensa.getProfesor() == null || !recompensa.getProfesor().getId().equals(user.getId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                        }
                    }
                    recompensaRepository.delete(recompensa);
                    return ResponseEntity.ok().<Void>build();
                }).orElse(ResponseEntity.notFound().build());
    }
}
