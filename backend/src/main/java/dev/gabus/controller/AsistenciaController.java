package dev.gabus.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Asistencia.Asistencia;
import dev.gabus.dto.Asistencia.Asistencia.EstadoAsistencia;
import dev.gabus.dto.Asistencia.AsistenciaRepository;
import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Grado.Grado;
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

    @GetMapping("/grado/{gradoId}/fecha/{fecha}")
    public ResponseEntity<List<Asistencia>> getAsistenciaByGradoAndFecha(
            @PathVariable Long gradoId, 
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        
        Usuario user = getCurrentUser();
        // Permission check implicitly handled by getting grade from one of the students or fetching grade first.
        // For efficiency, we will trust the query but verify one result if exists.
        
        List<Asistencia> asistencias = asistenciaRepository.findByGradoIdAndFecha(gradoId, fecha);
        
        if (!asistencias.isEmpty()) {
            Grado grado = asistencias.get(0).getEstudiante().getGrado();
             if (!canAccessGrado(user, grado)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        } 

        return ResponseEntity.ok(asistencias);
    }

    @PostMapping
    public ResponseEntity<?> registrarAsistencia(@RequestBody AsistenciaRequest request) {
        Usuario user = getCurrentUser();
        Estudiante estudiante = estudianteRepository.findById(request.getEstudianteId())
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado"));
        
        if (!canAccessGrado(user, estudiante.getGrado())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Asistencia asistencia = asistenciaRepository.findByEstudianteIdAndFecha(estudiante.getId(), request.getFecha())
                .orElse(Asistencia.builder()
                        .estudiante(estudiante)
                        .fecha(request.getFecha())
                        .build());
        
        asistencia.setEstado(request.getEstado());
        asistencia.setObservacion(request.getObservacion());

        return ResponseEntity.ok(asistenciaRepository.save(asistencia));
    }
    
    @PostMapping("/nfc")
    public ResponseEntity<?> registrarAsistenciaPorNfc(@RequestBody NfcAsistenciaRequest request) {
        Usuario user = getCurrentUser();
        
        Estudiante estudiante = estudianteRepository.findByNfcId(request.getNfcId())
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado con ese NFC"));

        if (!canAccessGrado(user, estudiante.getGrado())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        LocalDate today = LocalDate.now();
        Asistencia asistencia = asistenciaRepository.findByEstudianteIdAndFecha(estudiante.getId(), today)
                .orElse(Asistencia.builder()
                        .estudiante(estudiante)
                        .fecha(today)
                        .build());
        
        // Always mark as PRESENT when scanning NFC
        asistencia.setEstado(EstadoAsistencia.PRESENTE);
        
        return ResponseEntity.ok(asistenciaRepository.save(asistencia));
    }


    @Data
    public static class AsistenciaRequest {
        private Long estudianteId;
        private LocalDate fecha;
        private EstadoAsistencia estado;
        private String observacion;
    }
    
    @Data
    public static class NfcAsistenciaRequest {
        private String nfcId;
    }
}
