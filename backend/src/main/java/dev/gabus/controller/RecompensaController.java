package dev.gabus.controller;

import dev.gabus.dto.Recompensa.Recompensa;
import dev.gabus.dto.Recompensa.RecompensaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recompensas")
public class RecompensaController {

    @Autowired
    private RecompensaRepository recompensaRepository;

    // Obtener todas las recompensas
    @GetMapping
    public List<Recompensa> getAllRecompensas() {
        return recompensaRepository.findAll();
    }

    // Crear una nueva recompensa
    @PostMapping
    public Recompensa createRecompensa(@RequestBody Recompensa recompensa) {
        return recompensaRepository.save(recompensa);
    }

    // Actualizar una recompensa
    @PutMapping("/{id}")
    public ResponseEntity<Recompensa> updateRecompensa(@PathVariable Long id, @RequestBody Recompensa recompensaDetails) {
        return recompensaRepository.findById(id)
                .map(recompensa -> {
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
        return recompensaRepository.findById(id)
                .map(recompensa -> {
                    recompensaRepository.delete(recompensa);
                    return ResponseEntity.ok().<Void>build();
                }).orElse(ResponseEntity.notFound().build());
    }
}
