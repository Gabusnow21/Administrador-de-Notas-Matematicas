package dev.gabus.dto.Usuario;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data // Genera getters, setters, toString, equals, hashCode (de Lombok)
@Builder // Patrón de diseño Builder (de Lombok)
@NoArgsConstructor // Constructor sin argumentos (de Lombok)
@AllArgsConstructor // Constructor con todos los argumentos (de Lombok)
@Entity // Indica que esta clase es una entidad JPA
@Table(name = "_usuario", uniqueConstraints = {@UniqueConstraint(columnNames = {"username"})}) // Define la tabla y asegura que el username sea único
public class Usuario implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false)
    private String username; // Usaremos el email como username

    @Column(nullable = false)
    private String password; // Contraseña hasheada

    @Enumerated(EnumType.STRING) // Guarda el rol como texto (ej. "ADMIN") en lugar de un número
    private Role role;

    // Métodos de UserDetails (Spring Security)
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Devuelve una lista con la autoridad/rol de este usuario
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // La cuenta nunca expira
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // La cuenta nunca se bloquea
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // Las credenciales nunca expiran
    }

    @Override
    public boolean isEnabled() {
        return true; // La cuenta está siempre habilitada
    }
    
}
