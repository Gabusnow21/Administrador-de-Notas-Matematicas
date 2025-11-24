package dev.gabus.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Grado.Grado;
import dev.gabus.dto.Grado.GradoRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class EstudianteController {

    private final EstudianteRepository estudianteRepository;
    private final GradoRepository gradoRepository;

    // Listar todos los estudiantes
    @GetMapping
    public ResponseEntity<List<Estudiante>> getAllEstudiantes() {
        return ResponseEntity.ok(estudianteRepository.findAll());
    }

    // Listar estudiantes POR GRADO 
    @GetMapping("/grado/{gradoId}")
    public ResponseEntity<List<Estudiante>> getEstudiantesByGrado(@PathVariable Long gradoId) {
        return ResponseEntity.ok(estudianteRepository.findByGradoId(gradoId));
    }

    // Obtener un estudiante por ID (Para el encabezado del boletín)
    @GetMapping("/{id}")
    public ResponseEntity<Estudiante> getEstudianteById(@PathVariable Long id) {
        return ResponseEntity.ok(estudianteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado")));
    }

    // Crear estudiante
    @PostMapping
    public ResponseEntity<?> createEstudiante(@RequestBody EstudianteRequest request) {
        // 1. Buscamos el grado
        Grado grado = gradoRepository.findById(request.getGradoId())
                .orElseThrow(() -> new RuntimeException("Grado no encontrado"));

        // 2. Creamos el estudiante y asignamos el grado
        Estudiante estudiante = Estudiante.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .grado(grado)
                .build();

        return ResponseEntity.ok(estudianteRepository.save(estudiante));
    }

    // Clase auxiliar para recibir el JSON limpio
    @Data
    static class EstudianteRequest {
        private String nombre;
        private String apellido;
        private Long gradoId;
    }
}

