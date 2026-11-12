package dev.gabus.dto.Administracion;

import java.time.LocalDateTime;

public record EstudianteDesactivadoDTO(
        Long id,
        String nombres,
        String apellidos,
        String codigoProgreso,
        String grado,
        LocalDateTime fechaEliminacion,
        String eliminadoPorNombre
) {
}
