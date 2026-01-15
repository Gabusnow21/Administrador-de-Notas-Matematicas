package dev.gabus.dto.Usuario;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    //Accede a los datos de los usuarios en la base de datos: SELECT * FROM _usuario WHERE username = ?
    Optional<Usuario> findByUsername(String username);
    List<Usuario> findByRole(Role role);
}
