package dev.gabus.dto.Administracion;

import java.time.LocalDateTime;

public record AuditoriaBajaDTO(
        Long id,
        TipoRegistro tipo,
        Long registroId,
        String nombreRegistro,
        AccionBaja accion,
        LocalDateTime fecha,
        Long ejecutadoPorId,
        String ejecutadoPorNombre
) {
}
