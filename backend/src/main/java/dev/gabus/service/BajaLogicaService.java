package dev.gabus.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.gabus.dto.Administracion.AccionBaja;
import dev.gabus.dto.Administracion.AuditoriaBaja;
import dev.gabus.dto.Administracion.AuditoriaBajaDTO;
import dev.gabus.dto.Administracion.AuditoriaBajaRepository;
import dev.gabus.dto.Administracion.EstudianteDesactivadoDTO;
import dev.gabus.dto.Administracion.TipoRegistro;
import dev.gabus.dto.Administracion.UsuarioDesactivadoDTO;
import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Grado.Grado;
import dev.gabus.dto.Grado.GradoRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BajaLogicaService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final GradoRepository gradoRepository;
    private final AuditoriaBajaRepository auditoriaRepository;

    // ==========================================
    // PROFESORES
    // ==========================================

    @Transactional
    public Usuario desactivarProfesor(Long id, Usuario admin) {
        validarAdmin(admin);
        Usuario profesor = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesor no encontrado"));

        if (profesor.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede desactivar a un administrador");
        }
        if (!profesor.isActivo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El profesor ya está desactivado");
        }

        List<Grado> gradosAsignados = gradoRepository.findByProfesorId(id);
        if (!gradosAsignados.isEmpty()) {
            String nombresGrados = gradosAsignados.stream()
                    .map(g -> g.getNivel() + " \"" + g.getSeccion() + "\"")
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede desactivar al profesor porque tiene grados asignados: " + nombresGrados
                            + ". Reasígnelos a otro docente primero.");
        }

        profesor.setActivo(false);
        profesor.setFechaEliminacion(LocalDateTime.now());
        profesor.setEliminadoPor(admin.getId());
        Usuario guardado = usuarioRepository.save(profesor);

        registrarAuditoria(TipoRegistro.PROFESOR, profesor.getId(), nombreCompleto(profesor),
                AccionBaja.DESACTIVACION, admin);
        return guardado;
    }

    @Transactional
    public Usuario restaurarProfesor(Long id, Usuario admin) {
        validarAdmin(admin);
        Usuario profesor = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesor no encontrado"));

        if (profesor.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se puede restaurar a un administrador");
        }
        if (profesor.isActivo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El profesor ya está activo");
        }

        profesor.setActivo(true);
        profesor.setFechaEliminacion(null);
        profesor.setEliminadoPor(null);
        Usuario guardado = usuarioRepository.save(profesor);

        registrarAuditoria(TipoRegistro.PROFESOR, profesor.getId(), nombreCompleto(profesor),
                AccionBaja.RESTAURACION, admin);
        return guardado;
    }

    public List<UsuarioDesactivadoDTO> listarProfesoresDesactivados(Usuario admin) {
        validarAdmin(admin);
        return usuarioRepository.findByRoleAndActivoFalseOrderByApellidoAscNombreAsc(Role.USER).stream()
                .map(this::toUsuarioDesactivadoDTO)
                .toList();
    }

    // ==========================================
    // ESTUDIANTES
    // ==========================================

    @Transactional
    public Estudiante desactivarEstudiante(Long id, Usuario admin) {
        validarAdmin(admin);
        Estudiante estudiante = estudianteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudiante no encontrado"));

        if (!estudiante.isActivo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El estudiante ya está desactivado");
        }

        estudiante.setActivo(false);
        estudiante.setFechaEliminacion(LocalDateTime.now());
        estudiante.setEliminadoPor(admin.getId());
        Estudiante guardado = estudianteRepository.save(estudiante);

        registrarAuditoria(TipoRegistro.ESTUDIANTE, estudiante.getId(), nombreCompleto(estudiante),
                AccionBaja.DESACTIVACION, admin);
        return guardado;
    }

    @Transactional
    public Estudiante restaurarEstudiante(Long id, Usuario admin) {
        validarAdmin(admin);
        Estudiante estudiante = estudianteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudiante no encontrado"));

        if (estudiante.isActivo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El estudiante ya está activo");
        }

        estudiante.setActivo(true);
        estudiante.setFechaEliminacion(null);
        estudiante.setEliminadoPor(null);
        Estudiante guardado = estudianteRepository.save(estudiante);

        registrarAuditoria(TipoRegistro.ESTUDIANTE, estudiante.getId(), nombreCompleto(estudiante),
                AccionBaja.RESTAURACION, admin);
        return guardado;
    }

    public List<EstudianteDesactivadoDTO> listarEstudiantesDesactivados(Usuario admin) {
        validarAdmin(admin);
        return estudianteRepository.findByActivoFalseOrderByApellidosAscNombresAsc().stream()
                .map(this::toEstudianteDesactivadoDTO)
                .toList();
    }

    public List<EstudianteDesactivadoDTO> listarEstudiantesDesactivadosPorGrado(Long gradoId, Usuario admin) {
        validarAdmin(admin);
        return estudianteRepository.findByGrado_IdAndActivoFalseOrderByApellidosAscNombresAsc(gradoId).stream()
                .map(this::toEstudianteDesactivadoDTO)
                .toList();
    }

    // ==========================================
    // AUDITORÍA
    // ==========================================

    public Page<AuditoriaBajaDTO> historial(
            TipoRegistro tipo,
            AccionBaja accion,
            LocalDate desde,
            LocalDate hasta,
            String buscar,
            Pageable pageable,
            Usuario admin) {
        validarAdmin(admin);

        Specification<AuditoriaBaja> spec = (root, query, cb) -> cb.conjunction();
        if (tipo != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("tipo"), tipo));
        }
        if (accion != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("accion"), accion));
        }
        if (desde != null) {
            LocalDateTime inicio = desde.atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("fecha"), inicio));
        }
        if (hasta != null) {
            LocalDateTime fin = hasta.plusDays(1).atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.lessThan(root.get("fecha"), fin));
        }
        if (buscar != null && !buscar.isBlank()) {
            String patron = "%" + buscar.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("nombreRegistro")), patron),
                    cb.like(cb.lower(root.get("ejecutadoPorNombre")), patron)));
        }

        return auditoriaRepository.findAll(spec, pageable).map(this::toAuditoriaDTO);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private void validarAdmin(Usuario usuario) {
        if (usuario == null || usuario.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requieren permisos de administrador");
        }
    }

    private void registrarAuditoria(TipoRegistro tipo, Long registroId, String nombreRegistro,
            AccionBaja accion, Usuario admin) {
        AuditoriaBaja auditoria = AuditoriaBaja.builder()
                .tipo(tipo)
                .registroId(registroId)
                .nombreRegistro(nombreRegistro)
                .accion(accion)
                .fecha(LocalDateTime.now())
                .ejecutadoPorId(admin.getId())
                .ejecutadoPorNombre(nombreCompleto(admin))
                .build();
        auditoriaRepository.save(auditoria);
    }

    private String nombreCompleto(Usuario usuario) {
        String nombre = (usuario.getNombre() != null ? usuario.getNombre() : "").trim();
        String apellido = (usuario.getApellido() != null ? usuario.getApellido() : "").trim();
        return (nombre + " " + apellido).trim();
    }

    private String nombreCompleto(Estudiante estudiante) {
        String nombres = (estudiante.getNombres() != null ? estudiante.getNombres() : "").trim();
        String apellidos = (estudiante.getApellidos() != null ? estudiante.getApellidos() : "").trim();
        return (apellidos + ", " + nombres).trim();
    }

    private String nombreGrado(Grado grado) {
        if (grado == null) {
            return "Sin grado";
        }
        return grado.getNivel() + " \"" + grado.getSeccion() + "\"";
    }

    private String nombreEliminador(Long usuarioId) {
        if (usuarioId == null) {
            return "No registrado";
        }
        return usuarioRepository.findById(usuarioId)
                .map(this::nombreCompleto)
                .orElse("Usuario no disponible");
    }

    private UsuarioDesactivadoDTO toUsuarioDesactivadoDTO(Usuario usuario) {
        return new UsuarioDesactivadoDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getUsername(),
                usuario.getRole(),
                usuario.getFechaEliminacion(),
                nombreEliminador(usuario.getEliminadoPor()));
    }

    private EstudianteDesactivadoDTO toEstudianteDesactivadoDTO(Estudiante estudiante) {
        return new EstudianteDesactivadoDTO(
                estudiante.getId(),
                estudiante.getNombres(),
                estudiante.getApellidos(),
                estudiante.getCodigoProgreso(),
                nombreGrado(estudiante.getGrado()),
                estudiante.getFechaEliminacion(),
                nombreEliminador(estudiante.getEliminadoPor()));
    }

    private AuditoriaBajaDTO toAuditoriaDTO(AuditoriaBaja auditoria) {
        return new AuditoriaBajaDTO(
                auditoria.getId(),
                auditoria.getTipo(),
                auditoria.getRegistroId(),
                auditoria.getNombreRegistro(),
                auditoria.getAccion(),
                auditoria.getFecha(),
                auditoria.getEjecutadoPorId(),
                auditoria.getEjecutadoPorNombre());
    }
}
