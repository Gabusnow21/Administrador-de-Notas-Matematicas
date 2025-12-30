package dev.gabus.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Actividad.Actividad;
import dev.gabus.dto.Actividad.ActividadRepository;
import dev.gabus.dto.Calificacion.CalificacionRepository;
import dev.gabus.dto.Materia.Materia;
import dev.gabus.dto.Materia.MateriaRepository;
import dev.gabus.dto.Trimestre.TrimestreRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/actividades")
@RequiredArgsConstructor
public class ActividadController {

    private final ActividadRepository actividadRepository;
    private final MateriaRepository materiaRepository;
    private final TrimestreRepository trimestreRepository;
    private final CalificacionRepository calificacionRepository;
    private final UsuarioRepository usuarioRepository;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean canAccessMateria(Usuario user, Materia materia) {
        if (user.getRole() == Role.ADMIN) return true;
        if (materia.getProfesor() == null) return false;
        return materia.getProfesor().getId().equals(user.getId());
    }

    // Listar solo las actividades raíz (sin padre)
    @GetMapping
    public ResponseEntity<List<Actividad>> getActividades(
            @RequestParam Long materiaId,
            @RequestParam Long trimestreId
    ) {
        Materia materia = materiaRepository.findById(materiaId).orElseThrow(() -> new RuntimeException("Materia no encontrada"));
        Usuario user = getCurrentUser();

        if (!canAccessMateria(user, materia)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Actividad> rootActivities = actividadRepository.findByMateriaIdAndTrimestreIdAndParentIsNull(materiaId, trimestreId);
        return ResponseEntity.ok(rootActivities);
    }
    
    // Crear una nueva Actividad (raíz o sub-actividad)
    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody ActividadRequest request) {
        System.out.println("📥 Recibida petición POST /api/actividades: " + request);

        var materia = materiaRepository.findById(request.getMateriaId())
                .orElseThrow(() -> new RuntimeException("Materia no encontrada"));
        
        Usuario user = getCurrentUser();
        if (!canAccessMateria(user, materia)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var trimestre = trimestreRepository.findById(request.getTrimestreId())
                .orElseThrow(() -> new RuntimeException("Trimestre no encontrado"));

        Actividad parent = null;
        if (request.getParentId() != null) {
            parent = actividadRepository.findById(request.getParentId())
                    .orElseThrow(() -> new RuntimeException("Actividad padre no encontrada"));
        }

        // --- Validación de Ponderación ---
        if (parent == null) { // Solo se valida en actividades raíz
            BigDecimal totalPonderacion = actividadRepository.sumPonderacionOfRootActivities(request.getMateriaId(), request.getTrimestreId());
            if (totalPonderacion == null) {
                totalPonderacion = BigDecimal.ZERO;
            }
            // Si la suma actual + la nueva supera 100...
            if (totalPonderacion.add(request.getPonderacion()).compareTo(new BigDecimal("100.00")) > 0) {
                 return ResponseEntity.badRequest().body("La ponderación total no puede exceder el 100%. Ponderación actual: " + totalPonderacion + "%");

            }
        } else { // Si es una sub-actividad, la suma de hermanas no debe pasar la ponderación del padre
            BigDecimal totalPonderacionHijas = parent.getSubActividades().stream()
                .map(Actividad::getPonderacion)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            if (totalPonderacionHijas.add(request.getPonderacion()).compareTo(parent.getPonderacion()) > 0) {
                return ResponseEntity.badRequest().body("La suma de ponderaciones de las sub-actividades no puede exceder la ponderación del padre (" + parent.getPonderacion() + "%).");
            }
        }


        var actividad = Actividad.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .ponderacion(request.getPonderacion())
                .materia(materia)
                .trimestre(trimestre)
                .parent(parent)
                .promedia(request.isPromedia())
                .build();

        return ResponseEntity.ok(actividadRepository.save(actividad));
    }

    // Actualizar una Actividad
    @PutMapping
    @Transactional
    public ResponseEntity<?> update(@RequestBody ActividadRequest request) {
        if (request.getId() == null) {
            return ResponseEntity.badRequest().body("El ID es obligatorio para actualizar");
        }

        var actividad = actividadRepository.findById(request.getId())
                .orElseThrow(() -> new RuntimeException("Actividad no encontrada"));

        Usuario user = getCurrentUser();
        if (!canAccessMateria(user, actividad.getMateria())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        // --- Validación de Ponderación ---
        if (actividad.getParent() == null) { // Es una actividad raíz
            BigDecimal totalPonderacion = actividadRepository.sumPonderacionOfRootActivities(request.getMateriaId(), request.getTrimestreId());
             if (totalPonderacion == null) {
                totalPonderacion = BigDecimal.ZERO;
            }
            // Restamos la ponderación original de la actividad que se edita
            totalPonderacion = totalPonderacion.subtract(actividad.getPonderacion());
            
            // Si la suma (sin contar la actividad actual) + la nueva ponderación supera 100...
            if (totalPonderacion.add(request.getPonderacion()).compareTo(new BigDecimal("100.00")) > 0) {
                 return ResponseEntity.badRequest().body("La ponderación total no puede exceder el 100%.");
            }
        } else { // Es una sub-actividad
            BigDecimal totalPonderacionHijas = actividad.getParent().getSubActividades().stream()
                .filter(hija -> !hija.getId().equals(actividad.getId())) // Excluir la actual
                .map(Actividad::getPonderacion)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalPonderacionHijas.add(request.getPonderacion()).compareTo(actividad.getParent().getPonderacion()) > 0) {
                return ResponseEntity.badRequest().body("La suma de ponderaciones de las sub-actividades no puede exceder la ponderación del padre.");
            }
        }


        actividad.setNombre(request.getNombre());
        actividad.setDescripcion(request.getDescripcion());
        actividad.setPonderacion(request.getPonderacion());
        actividad.setPromedia(request.isPromedia());
        // No se debería poder cambiar de materia o trimestre, ni de padre.

        return ResponseEntity.ok(actividadRepository.save(actividad));
    }

    // Eliminar una Actividad y sus calificaciones asociadas
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!actividadRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        Actividad actividad = actividadRepository.findById(id).get();
        Usuario user = getCurrentUser();
        if (!canAccessMateria(user, actividad.getMateria())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 1. Eliminar calificaciones asociadas
        calificacionRepository.deleteByActividadId(id);
        
        // 2. Eliminar la actividad
        actividadRepository.deleteById(id);
        
        return ResponseEntity.noContent().build();
    }

    // Endpoint para Sincronización Total
    @GetMapping("/all")
    public ResponseEntity<List<Actividad>> getAll() {
        Usuario user = getCurrentUser();
        List<Actividad> allActivities = actividadRepository.findAll();
        
        if (user.getRole() == Role.ADMIN) {
             return ResponseEntity.ok(allActivities);
        } else {
             List<Actividad> filtered = allActivities.stream()
                .filter(a -> canAccessMateria(user, a.getMateria()))
                .collect(Collectors.toList());
             return ResponseEntity.ok(filtered);
        }
    }

    // --- DTO para Peticiones ---
    @Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class ActividadRequest {
        private Long id;
        private String nombre;
        private String descripcion;
        private java.math.BigDecimal ponderacion;
        private Long materiaId;
        private Long trimestreId;
        private Long parentId;
        private boolean promedia;
    }
}

