package dev.gabus.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
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
import lombok.RequiredArgsConstructor;

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

    //Obtener grado por ID
    @GetMapping("/{id}")
    public ResponseEntity<Grado> getGradoById(@PathVariable Long id) {
        return gradoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Crear un nuevo grado
    @PostMapping
    public ResponseEntity<Grado> createGrado(@RequestBody Grado grado) {
        return ResponseEntity.ok(gradoRepository.save(grado));
    }

    //Actualizar grado
    @PutMapping
    public ResponseEntity<Grado> updateGrado(@RequestBody Grado grado) {
        return ResponseEntity.ok(gradoRepository.save(grado)); // .save() actualiza si el ID existe
    }

    
    // (Opcional) Borrar grado
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGrado(@PathVariable Long id) {
        gradoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}