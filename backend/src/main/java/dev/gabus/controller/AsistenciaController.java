package dev.gabus.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Asistencia.Asistencia;
import dev.gabus.dto.Asistencia.AsistenciaRepository;
import dev.gabus.dto.Asistencia.EstadoAsistencia;
import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Grado.Grado;
import dev.gabus.dto.Grado.GradoRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/asistencia")
@RequiredArgsConstructor
public class AsistenciaController {

    private final AsistenciaRepository asistenciaRepository;
    private final EstudianteRepository estudianteRepository;
    private final GradoRepository gradoRepository;
    private final UsuarioRepository usuarioRepository;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean canAccessGrado(Usuario user, Grado grado) {
        if (user.getRole() == Role.ADMIN) return true;
        if (grado == null || grado.getProfesor() == null) return false;
        return grado.getProfesor().getId().equals(user.getId());
    }

    @PostMapping("/registrar")
    public ResponseEntity<?> registrarAsistencia(@RequestBody AsistenciaRequest request) {
        Usuario user = getCurrentUser();
        Optional<Estudiante> estudianteOpt;

        if (request.getNfcId() != null) {
            estudianteOpt = estudianteRepository.findByNfcId(request.getNfcId());
        } else if (request.getEstudianteId() != null) {
            estudianteOpt = estudianteRepository.findById(request.getEstudianteId());
        } else {
            return ResponseEntity.badRequest().body("Debe proporcionar estudianteId o nfcId");
        }

        if (estudianteOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Estudiante estudiante = estudianteOpt.get();

        if (estudiante.getGrado() == null || !canAccessGrado(user, estudiante.getGrado())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        LocalDate fecha = request.getFecha() != null ? request.getFecha() : LocalDate.now();
        LocalTime hora = request.getHora() != null ? request.getHora() : LocalTime.now();

        Optional<Asistencia> existingAsistencia = asistenciaRepository.findByEstudianteIdAndFecha(estudiante.getId(), fecha);

        Asistencia asistencia;
        if (existingAsistencia.isPresent()) {
            asistencia = existingAsistencia.get();
            asistencia.setEstado(request.getEstado());
            asistencia.setHora(hora); // Update time too? Maybe not always desirable, but for corrections it is.
        } else {
            asistencia = Asistencia.builder()
                    .estudiante(estudiante)
                    .fecha(fecha)
                    .hora(hora)
                    .estado(request.getEstado())
                    .build();
        }

        return ResponseEntity.ok(asistenciaRepository.save(asistencia));
    }

    @GetMapping("/grado/{gradoId}")
    public ResponseEntity<?> getAsistenciaPorGrado(
            @PathVariable Long gradoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        
        Usuario user = getCurrentUser();
        Grado grado = gradoRepository.findById(gradoId).orElse(null);

        if (grado == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canAccessGrado(user, grado)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        LocalDate queryDate = fecha != null ? fecha : LocalDate.now();
        return ResponseEntity.ok(asistenciaRepository.findByGradoIdAndFecha(gradoId, queryDate));
    }
    
    @GetMapping("/estudiante/{estudianteId}")
    public ResponseEntity<?> getHistorialEstudiante(@PathVariable Long estudianteId) {
        Usuario user = getCurrentUser();
        Estudiante estudiante = estudianteRepository.findById(estudianteId).orElse(null);

        if (estudiante == null) {
             return ResponseEntity.notFound().build();
        }

        if (estudiante.getGrado() == null || !canAccessGrado(user, estudiante.getGrado())) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(asistenciaRepository.findByEstudianteId(estudianteId));
    }

    @Data
    public static class AsistenciaRequest {
        private Long estudianteId;
        private String nfcId;
        private LocalDate fecha;
        private LocalTime hora;
        private EstadoAsistencia estado;
    }
}
