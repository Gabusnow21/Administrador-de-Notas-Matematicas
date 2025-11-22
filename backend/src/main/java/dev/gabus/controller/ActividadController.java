package dev.gabus.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Actividad.Actividad;
import dev.gabus.dto.Actividad.ActividadRepository;
import dev.gabus.dto.Materia.MateriaRepository;
import dev.gabus.dto.Trimestre.TrimestreRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/actividades")
@RequiredArgsConstructor
public class ActividadController {

    private final ActividadRepository actividadRepository;
    private final MateriaRepository materiaRepository;
    private final TrimestreRepository trimestreRepository;

    // Listar actividades de una Materia en un Trimestre
    // GET /api/actividades?materiaId=1&trimestreId=2
    @GetMapping
    public ResponseEntity<List<Actividad>> getActividades(
            @RequestParam Long materiaId,
            @RequestParam Long trimestreId
    ) {
        return ResponseEntity.ok(
            actividadRepository.findByMateriaIdAndTrimestreId(materiaId, trimestreId)
        );
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ActividadRequest request) {
        var materia = materiaRepository.findById(request.getMateriaId())
                .orElseThrow(() -> new RuntimeException("Materia no encontrada"));
        
        var trimestre = trimestreRepository.findById(request.getTrimestreId())
                .orElseThrow(() -> new RuntimeException("Trimestre no encontrado"));

        var actividad = Actividad.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .ponderacion(request.getPonderacion())
                .materia(materia)
                .trimestre(trimestre)
                .build();

        return ResponseEntity.ok(actividadRepository.save(actividad));
    }

    @Data
    public static class ActividadRequest {
        private String nombre;
        private String descripcion;
        private BigDecimal ponderacion; // Ej. 0.20
        private Long materiaId;
        private Long trimestreId;
    }
    
}
