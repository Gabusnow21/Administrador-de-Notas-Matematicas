package dev.gabus.dto.Estudiante;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EstudianteRepository extends JpaRepository<Estudiante, Long> {

    List<Estudiante> findByGrado_Id(Long gradoId);
    
    Optional<Estudiante> findByNfcId(String nfcId);

    Optional<Estudiante> findByCodigoProgreso(String codigoProgreso);

    List<Estudiante> findByNfcIdIsNull();
}
