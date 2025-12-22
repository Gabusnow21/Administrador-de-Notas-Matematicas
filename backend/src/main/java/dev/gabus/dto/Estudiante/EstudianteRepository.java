package dev.gabus.dto.Estudiante;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EstudianteRepository extends JpaRepository<Estudiante, Long> {
    //Obtener los estudiantes por grado: SELECT * FROM _estudiante WHERE grado_id = ?
    List<Estudiante> findByGradoId(Long gradoId);
    
    Optional<Estudiante> findByNfcId(String nfcId);

    // Nuevo: Encontrar estudiantes que no tienen NFC ID asignado
    List<Estudiante> findByNfcIdIsNull();
}
