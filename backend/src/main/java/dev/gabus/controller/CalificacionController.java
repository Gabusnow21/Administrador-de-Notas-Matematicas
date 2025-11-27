package dev.gabus.controller;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Actividad.ActividadRepository;
import dev.gabus.dto.Calificacion.Calificacion;
import dev.gabus.dto.Calificacion.CalificacionRepository;
import dev.gabus.dto.Calificacion.PlanillaItemDTO;
import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/calificaciones")
@RequiredArgsConstructor
public class CalificacionController {
    private final CalificacionRepository calificacionRepository;
    private final EstudianteRepository estudianteRepository;
    private final ActividadRepository actividadRepository;

    // 1. Obtener notas de una actividad específica (Para ver rendimiento del grupo)
    @GetMapping("/actividad/{actividadId}")
    public ResponseEntity<List<Calificacion>> getPorActividad(@PathVariable Long actividadId) {
        return ResponseEntity.ok(calificacionRepository.findByActividadId(actividadId));
    }

    // 2. Obtener notas de un estudiante (Boletín preliminar)
    @GetMapping("/estudiante/{estudianteId}")
    public ResponseEntity<List<Calificacion>> getPorEstudiante(@PathVariable Long estudianteId) {
        return ResponseEntity.ok(calificacionRepository.findByEstudianteId(estudianteId));
    }

    // 3. Poner o Actualizar una nota (Upsert)
    @PostMapping
    public ResponseEntity<?> guardarCalificacion(@RequestBody CalificacionRequest request) {
        
        // Validar existencia de estudiante y actividad
        var estudiante = estudianteRepository.findById(request.getEstudianteId())
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado"));
        
        var actividad = actividadRepository.findById(request.getActividadId())
                .orElseThrow(() -> new RuntimeException("Actividad no encontrada"));

        // Buscar si YA existe una nota para este par Estudiante-Actividad
        Calificacion existente = calificacionRepository
                .findByEstudianteIdAndActividadId(request.getEstudianteId(), request.getActividadId());

        Calificacion calificacion;

        if (existente != null) {
            // SI EXISTE: Actualizamos la nota
            calificacion = existente;
            calificacion.setNota(request.getNota());
            calificacion.setObservacion(request.getObservacion());
        } else {
            // NO EXISTE: Creamos una nueva
            calificacion = Calificacion.builder()
                    .estudiante(estudiante)
                    .actividad(actividad)
                    .nota(request.getNota())
                    .observacion(request.getObservacion())
                    .build();
        }

        return ResponseEntity.ok(calificacionRepository.save(calificacion));
    }

    // 4. Obtener planilla de calificaciones para una actividad y grado
    @GetMapping("/planilla")
    public ResponseEntity<List<PlanillaItemDTO>> obtenerPlanilla(
            @RequestParam Long gradoId,
            @RequestParam Long actividadId
    ) {
        // 1. Obtener todos los estudiantes del grado
        List<Estudiante> estudiantes = estudianteRepository.findByGradoId(gradoId);
        
        // 2. Obtener las notas existentes para esa actividad
        List<Calificacion> notasExistentes = calificacionRepository.findByActividadId(actividadId);

        // 3. Fusionar las listas (Estudiantes + Notas)
        List<PlanillaItemDTO> planilla = new ArrayList<>();

        for (Estudiante est : estudiantes) {
            // Buscamos si este estudiante ya tiene nota en la lista de notas
            Calificacion notaEncontrada = notasExistentes.stream()
                    .filter(n -> n.getEstudiante().getId().equals(est.getId()))
                    .findFirst()
                    .orElse(null);

            planilla.add(PlanillaItemDTO.builder()
                    .estudianteId(est.getId())
                    .nombreEstudiante(est.getNombre())
                    .apellidoEstudiante(est.getApellido())
                    .calificacionId(notaEncontrada != null ? notaEncontrada.getId() : null)
                    .nota(notaEncontrada != null ? notaEncontrada.getNota() : null)
                    .observacion(notaEncontrada != null ? notaEncontrada.getObservacion() : null)
                    .build());
        }

        return ResponseEntity.ok(planilla);
    }

    // DTO Interno para recibir los datos
    @Data
    public static class CalificacionRequest {
        private Long estudianteId;
        private Long actividadId;
        private BigDecimal nota;       // Ej: 85.50
        private String observacion;    // Ej: "Entregó tarde"
    }
}
