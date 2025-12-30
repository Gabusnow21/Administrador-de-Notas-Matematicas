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

import dev.gabus.dto.Trimestre.Trimestre;
import dev.gabus.dto.Trimestre.TrimestreRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/trimestres")
@RequiredArgsConstructor
public class TrimestreController {
    private final TrimestreRepository trimestreRepository;

    @GetMapping
    public ResponseEntity<List<Trimestre>> getAll() {
        return ResponseEntity.ok(trimestreRepository.findAll());
    }

    // Obtener trimestres por año (ej. 2024)
    @GetMapping("/anio/{anio}")
    public ResponseEntity<List<Trimestre>> getByAnio(@PathVariable int anio) {
        return ResponseEntity.ok(trimestreRepository.findByAnioEscolar(anio));
    }

    @PostMapping
    public ResponseEntity<Trimestre> create(@RequestBody Trimestre trimestre) {
        return ResponseEntity.ok(trimestreRepository.save(trimestre));
    }

    @PutMapping
    public ResponseEntity<Trimestre> update(@RequestBody Trimestre trimestre) {
        return ResponseEntity.ok(trimestreRepository.save(trimestre));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!trimestreRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        trimestreRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
}
