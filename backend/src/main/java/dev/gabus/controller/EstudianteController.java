package dev.gabus.controller;

import java.util.List;
import java.util.stream.Collectors;

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
        if (grado.getProfesor() == null) return false;
        return grado.getProfesor().getId().equals(user.getId());
    }

    // Listar todos los estudiantes
    @GetMapping
    public ResponseEntity<List<Estudiante>> getAllEstudiantes() {
        Usuario user = getCurrentUser();
        List<Estudiante> allStudents = estudianteRepository.findAll();

        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(allStudents);
        } else {
            // Filter students belonging to grades owned by the teacher
            List<Estudiante> filtered = allStudents.stream()
                .filter(s -> canAccessGrado(user, s.getGrado()))
                .collect(Collectors.toList());
            return ResponseEntity.ok(filtered);
        }
    }

    // Listar estudiantes POR GRADO 
    @GetMapping("/grado/{gradoId}")
    public ResponseEntity<List<Estudiante>> getEstudiantesByGrado(@PathVariable Long gradoId) {
        Grado grado = gradoRepository.findById(gradoId).orElseThrow(() -> new RuntimeException("Grado no encontrado"));
        Usuario user = getCurrentUser();

        if (!canAccessGrado(user, grado)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(estudianteRepository.findByGradoId(gradoId));
    }

    // Obtener un estudiante por ID (Para el encabezado del boletín)
    @GetMapping("/{id}")
    public ResponseEntity<Estudiante> getEstudianteById(@PathVariable Long id) {
        Estudiante estudiante = estudianteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado"));
        
        Usuario user = getCurrentUser();
        if (!canAccessGrado(user, estudiante.getGrado())) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(estudiante);
    }

    // Nuevo: Listar estudiantes sin NFC ID asignado
    @GetMapping("/sin-nfc")
    public ResponseEntity<List<Estudiante>> getEstudiantesWithoutNfcId() {
        Usuario user = getCurrentUser();
        // Ideally should filter by owned grades in the query, but filtering in memory for simplicity now
        List<Estudiante> students = estudianteRepository.findByNfcIdIsNull();
        
        if (user.getRole() == Role.ADMIN) {
             return ResponseEntity.ok(students);
        } else {
             List<Estudiante> filtered = students.stream()
                .filter(s -> canAccessGrado(user, s.getGrado()))
                .collect(Collectors.toList());
             return ResponseEntity.ok(filtered);
        }
    }

    // Crear estudiante
    @PostMapping
    public ResponseEntity<?> createEstudiante(@RequestBody EstudianteRequest request) {
        Usuario user = getCurrentUser();
        // 1. Buscamos el grado
        Grado grado = gradoRepository.findById(request.getGradoId())
                .orElseThrow(() -> new RuntimeException("Grado no encontrado"));
        
        if (!canAccessGrado(user, grado)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 2. Creamos el estudiante y asignamos el grado
        Estudiante estudiante = Estudiante.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .grado(grado)
                .build();

        return ResponseEntity.ok(estudianteRepository.save(estudiante));
    }

    //Actualizar estudiante
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEstudiante(@PathVariable Long id, @RequestBody EstudianteRequest request) {
        Usuario user = getCurrentUser();

        return estudianteRepository.findById(id).map(estudiante -> {
            
            if (!canAccessGrado(user, estudiante.getGrado())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Actualizamos datos básicos
            estudiante.setNombre(request.getNombre());
            estudiante.setApellido(request.getApellido());
            
            // Si cambió de grado, lo buscamos y actualizamos
            if (!estudiante.getGrado().getId().equals(request.getGradoId())) {
                Grado nuevoGrado = gradoRepository.findById(request.getGradoId())
                    .orElseThrow(() -> new RuntimeException("Grado no encontrado"));
                
                if (!canAccessGrado(user, nuevoGrado)) {
                     return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }

                estudiante.setGrado(nuevoGrado);
            }
            
            return ResponseEntity.ok(estudianteRepository.save(estudiante));
        }).orElse(ResponseEntity.notFound().build());
    }

    // BORRAR Estudiante
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEstudiante(@PathVariable Long id) {
        Usuario user = getCurrentUser();

        if (!estudianteRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        // Optional: Allow teacher to delete students from their grade? 
        // Original request said "access to resources he created". 
        // Assuming teacher can manage students in their grades.
        Estudiante estudiante = estudianteRepository.findById(id).get();
        if (!canAccessGrado(user, estudiante.getGrado())) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        estudianteRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Clase auxiliar para recibir el JSON limpio
    @Data
    public static class EstudianteRequest {
        private String nombre;
        private String apellido;
        private Long gradoId;
    }
}

