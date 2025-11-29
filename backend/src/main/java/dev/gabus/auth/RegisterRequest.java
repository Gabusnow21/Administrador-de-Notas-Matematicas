package dev.gabus.auth;

import dev.gabus.dto.Usuario.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    private String nombre;
    private String apellido;
    private String username; // Email
    private String password;
    private Role role;
    
}
