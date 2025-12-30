package dev.gabus.dto.Materia;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MateriaRepository extends JpaRepository<Materia, Long> {
    List<Materia> findByProfesorId(Long profesorId);
    List<Materia> findByProfesorUsername(String username);
}
