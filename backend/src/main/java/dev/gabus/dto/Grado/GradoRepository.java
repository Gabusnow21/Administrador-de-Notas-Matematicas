package dev.gabus.dto.Grado;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GradoRepository extends JpaRepository<Grado, Long> {
    List<Grado> findByProfesorId(Long profesorId);
    List<Grado> findByProfesorUsername(String username);
}
