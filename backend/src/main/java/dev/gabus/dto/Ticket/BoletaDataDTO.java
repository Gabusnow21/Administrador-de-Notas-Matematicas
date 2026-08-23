package dev.gabus.dto.Ticket;

import java.math.BigDecimal;
import java.util.List;

// DTO plano con la informacion necesaria para que el frontend
// genere la boleta (boletin) con jsPDF. Evita serializar entidades JPA.
public record BoletaDataDTO(
    EstudianteDTO estudiante,
    List<CalificacionDTO> calificaciones,
    List<ActividadDTO> actividades,
    List<MateriaDTO> materias,
    List<TrimestreDTO> trimestres
) {

    public record EstudianteDTO(String nombres, String apellidos, String codigoProgreso) {}

    public record CalificacionDTO(BigDecimal nota, Long actividadId) {}

    public record ActividadDTO(Long id, String nombre, BigDecimal ponderacion, Long materiaId, Long trimestreId) {}

    public record MateriaDTO(Long id, String nombre) {}

    public record TrimestreDTO(Long id) {}
}
