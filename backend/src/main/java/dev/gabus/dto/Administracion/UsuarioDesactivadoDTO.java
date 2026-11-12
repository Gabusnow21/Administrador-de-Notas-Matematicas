package dev.gabus.dto.Administracion;

import java.time.LocalDateTime;

import dev.gabus.dto.Usuario.Role;

public record UsuarioDesactivadoDTO(
        Long id,
        String nombre,
        String apellido,
        String username,
        Role role,
        LocalDateTime fechaEliminacion,
        String eliminadoPorNombre
) {
}
