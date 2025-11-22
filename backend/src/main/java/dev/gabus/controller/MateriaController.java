package dev.gabus.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Materia.Materia;
import dev.gabus.dto.Materia.MateriaRepository;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/materias")
public class MateriaController {
    private final MateriaRepository materiaRepository;

    @GetMapping
    public ResponseEntity<List<Materia>> getAll() {
        return ResponseEntity.ok(materiaRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Materia> create(@RequestBody Materia materia) {
        return ResponseEntity.ok(materiaRepository.save(materia));
    }
    
}
