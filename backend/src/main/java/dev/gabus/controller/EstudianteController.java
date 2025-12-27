package dev.gabus.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
@RequestMapping("/api/estudiantes")
@RequiredArgsConstructor
public class EstudianteController {

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
        // Added null check for grado here as well, although controller methods check it before calling.
        if (grado == null || grado.getProfesor() == null) return false; 
        return grado.getProfesor().getId().equals(user.getId());
    }

    @GetMapping
    public ResponseEntity<List<Estudiante>> getAllEstudiantes() {
        Usuario user = getCurrentUser();
        List<Estudiante> allStudents = estudianteRepository.findAll();

        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(allStudents);
        } else {
            List<Estudiante> filtered = allStudents.stream()
                .filter(s -> s.getGrado() != null && canAccessGrado(user, s.getGrado()))
                .collect(Collectors.toList());
            return ResponseEntity.ok(filtered);
        }
    }

    @GetMapping("/grado/{gradoId}")
    public ResponseEntity<List<Estudiante>> getEstudiantesByGrado(@PathVariable Long gradoId) {
        // Fetch Grado first and handle potential not found case explicitly
        Optional<Grado> gradoOptional = gradoRepository.findById(gradoId);
        if (!gradoOptional.isPresent()) {
            // Return NOT_FOUND if the grade doesn't exist, instead of a generic 500
            return ResponseEntity.notFound().build();
        }
        Grado grado = gradoOptional.get();
        
        Usuario user = getCurrentUser();

        if (!canAccessGrado(user, grado)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Fetch students for the grade
        List<Estudiante> students = estudianteRepository.findByGradoId(gradoId);
        
        // Defensive check: filter out students with null grades if any exist in DB despite entity constraint
        // This could happen if data integrity is compromised at the DB level.
        List<Estudiante> validStudents = students.stream()
            .filter(s -> s.getGrado() != null) 
            .collect(Collectors.toList());

        return ResponseEntity.ok(validStudents);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Estudiante> getEstudianteById(@PathVariable Long id) {
        Estudiante estudiante = estudianteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado"));
        
        Usuario user = getCurrentUser();
        // Add null check for estudiante.getGrado() before calling canAccessGrado
        if (estudiante.getGrado() == null) {
            // Log this as an inconsistency in the database or entity loading
            System.err.println("Inconsistent data: Estudiante with ID " + id + " has a null Grado.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Student data is inconsistent: missing grade information.");
        }
        if (!canAccessGrado(user, estudiante.getGrado())) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(estudiante);
    }
    
    @GetMapping("/progreso/{codigo}")
    public ResponseEntity<Estudiante> getEstudianteByCodigoProgreso(@PathVariable String codigo) {
        // This method does not check for user permissions based on Grado, 
        // assuming direct code access bypasses standard grade-based access control.
        // If permission checks are needed here, they should be added.
        return estudianteRepository.findByCodigoProgreso(codigo)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sin-nfc")
    public ResponseEntity<List<Estudiante>> getEstudiantesWithoutNfcId() {
        Usuario user = getCurrentUser();
        List<Estudiante> students = estudianteRepository.findByNfcIdIsNull();
        
        if (user.getRole() == Role.ADMIN) {
             return ResponseEntity.ok(students);
        }
        else {
             List<Estudiante> filtered = students.stream()
                .filter(s -> s.getGrado() != null && canAccessGrado(user, s.getGrado()))
                .collect(Collectors.toList());
             return ResponseEntity.ok(filtered);
        }
    }

    @PostMapping
    public ResponseEntity<?> createEstudiante(@RequestBody EstudianteRequest request) {
        Usuario user = getCurrentUser();
        Grado grado = gradoRepository.findById(request.getGradoId())
                .orElseThrow(() -> new RuntimeException("Grado no encontrado"));
        
        if (!canAccessGrado(user, grado)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Estudiante estudiante = Estudiante.builder()
                .nombres(request.getNombres())
                .apellidos(request.getApellidos())
                .email(request.getEmail())
                .grado(grado)
                .codigoProgreso(request.getCodigoProgreso())
                .build();
        try {
            return ResponseEntity.ok(estudianteRepository.save(estudiante));
        } catch (DataIntegrityViolationException e) {
            // Check if the conflict is due to codigoProgreso or other unique constraint
            if (e.getMessage().contains("codigo_progreso")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El código de progreso ya existe."));
            } else {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Error de integridad de datos."));
            }
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEstudiante(@PathVariable Long id, @RequestBody EstudianteRequest request) {
        Usuario user = getCurrentUser();

        return estudianteRepository.findById(id).map(estudiante -> {
            
            // Add null check for estudiante.getGrado() before calling canAccessGrado
            if (estudiante.getGrado() == null) {
                System.err.println("Inconsistent data: Estudiante with ID " + id + " has a null Grado during update.");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Student data is inconsistent: missing grade information.");
            }
            if (!canAccessGrado(user, estudiante.getGrado())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            estudiante.setNombres(request.getNombres());
            estudiante.setApellidos(request.getApellidos());
            estudiante.setEmail(request.getEmail());
            // Only update codigoProgreso if it comes in the request and is different from the current one
            if (request.getCodigoProgreso() != null && !request.getCodigoProgreso().equals(estudiante.getCodigoProgreso())) {
                estudiante.setCodigoProgreso(request.getCodigoProgreso());
            }
            
            // Only update grade if it comes in the request and is different from the current one
            if (request.getGradoId() != null && (estudiante.getGrado() == null || !estudiante.getGrado().getId().equals(request.getGradoId()))) {
                Grado nuevoGrado = gradoRepository.findById(request.getGradoId())
                    .orElseThrow(() -> new RuntimeException("Grado no encontrado"));
                
                if (!canAccessGrado(user, nuevoGrado)) {
                     return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }

                estudiante.setGrado(nuevoGrado);
            }
            
            try {
                return ResponseEntity.ok(estudianteRepository.save(estudiante));
            } catch (DataIntegrityViolationException e) {
                // Check if the conflict is due to codigoProgreso or other unique constraint
                if (e.getMessage().contains("codigo_progreso")) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El código de progreso ya existe."));
                } else {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Error de integridad de datos."));
                }
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEstudiante(@PathVariable Long id) {
        Usuario user = getCurrentUser();

        // Fetch student first to check grade and permissions before deletion
        return estudianteRepository.findById(id).map(estudiante -> {
            if (estudiante.getGrado() == null) {
                System.err.println("Inconsistent data: Estudiante with ID " + id + " has a null Grado during deletion.");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Student data is inconsistent: missing grade information.");
            }
            if (!canAccessGrado(user, estudiante.getGrado())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            estudianteRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @Data
    public static class EstudianteRequest {
        private String nombres;
        private String apellidos;
        private String email;
        private Long gradoId;
        private String codigoProgreso;
    }
}

