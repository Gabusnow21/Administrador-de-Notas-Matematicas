package dev.gabus.dto.Estudiante;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EstudianteRepository extends JpaRepository<Estudiante, Long> {

    List<Estudiante> findByGrado_IdOrderByApellidosAsc(Long gradoId);
    
    Optional<Estudiante> findByNfcId(String nfcId);

    Optional<Estudiante> findByCodigoProgreso(String codigoProgreso);

    List<Estudiante> findByNfcIdIsNull();

    // --- Borrado lógico ---
    List<Estudiante> findByActivoTrue();
    List<Estudiante> findByGrado_IdAndActivoTrueOrderByApellidosAsc(Long gradoId);
    List<Estudiante> findByActivoFalseOrderByApellidosAscNombresAsc();
    List<Estudiante> findByGrado_IdAndActivoFalseOrderByApellidosAscNombresAsc(Long gradoId);
    Optional<Estudiante> findByNfcIdAndActivoTrue(String nfcId);
    Optional<Estudiante> findByCodigoProgresoAndActivoTrue(String codigoProgreso);
    List<Estudiante> findByNfcIdIsNullAndActivoTrue();
    Optional<Estudiante> findByIdAndActivoTrue(Long id);
}
