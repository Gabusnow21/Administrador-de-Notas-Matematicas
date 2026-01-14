package dev.gabus.dto.Asistencia;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {
    List<Asistencia> findByFecha(LocalDate fecha);
    List<Asistencia> findByEstudianteId(Long estudianteId);
    Optional<Asistencia> findByEstudianteIdAndFecha(Long estudianteId, LocalDate fecha);
    
    @Query("SELECT a FROM Asistencia a WHERE a.estudiante.grado.id = :gradoId AND a.fecha = :fecha")
    List<Asistencia> findByGradoIdAndFecha(@Param("gradoId") Long gradoId, @Param("fecha") LocalDate fecha);
}
