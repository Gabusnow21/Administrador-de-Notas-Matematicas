package dev.gabus.dto.Actividad;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActividadRepository extends JpaRepository<Actividad, Long> {
    
    //Obtener actividades de una materia en un trimestre: SELECT * FROM _actividad WHERE materia_id = ? AND trimestre_id = ?
    List<Actividad> findByMateriaIdAndTrimestreId(Long materiaId, Long trimestreId);

    // Obtener solo las actividades principales (las que no tienen padre)
    @Query("SELECT a FROM Actividad a LEFT JOIN FETCH a.subActividades WHERE a.materia.id = :materiaId AND a.trimestre.id = :trimestreId AND a.parent IS NULL")
    List<Actividad> findByMateriaIdAndTrimestreIdAndParentIsNull(@Param("materiaId") Long materiaId, @Param("trimestreId") Long trimestreId);

    // Sumar la ponderación de las actividades principales para un trimestre y materia
    @Query("SELECT SUM(a.ponderacion) FROM Actividad a WHERE a.materia.id = :materiaId AND a.trimestre.id = :trimestreId AND a.parent IS NULL")
    BigDecimal sumPonderacionOfRootActivities(@Param("materiaId") Long materiaId, @Param("trimestreId") Long trimestreId);
    
}
