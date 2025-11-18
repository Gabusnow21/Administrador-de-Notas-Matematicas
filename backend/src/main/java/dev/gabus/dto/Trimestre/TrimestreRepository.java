package dev.gabus.dto.Trimestre;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrimestreRepository extends JpaRepository<Trimestre, Long> {
    //Busca trimestres por año escolar: SELECT * FROM _trimestre WHERE grado_id = ?
    List<Trimestre> findByGradoId(Long gradoId);
    
}
