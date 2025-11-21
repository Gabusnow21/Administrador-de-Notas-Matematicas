package dev.gabus.controller;

import dev.gabus.dto.Grado.Grado;
import dev.gabus.dto.Grado.GradoRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grados")
@RequiredArgsConstructor
public class GradoController {

    private final GradoRepository gradoRepository;

    // Obtener todos los grados
    @GetMapping
    public ResponseEntity<List<Grado>> getAllGrados() {
        return ResponseEntity.ok(gradoRepository.findAll());
    }

    // Crear un nuevo grado
    @PostMapping
    public ResponseEntity<Grado> createGrado(@RequestBody Grado grado) {
        return ResponseEntity.ok(gradoRepository.save(grado));
    }
    
    // (Opcional) Borrar grado
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGrado(@PathVariable Long id) {
        gradoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}