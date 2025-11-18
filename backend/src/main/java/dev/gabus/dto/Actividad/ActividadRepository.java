package dev.gabus.dto.Actividad;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ActividadRepository extends JpaRepository<Actividad, Long> {
    //Obtener actividades de una materia en un trimestre: SELECT * FROM _actividad WHERE materia_id = ? AND trimestre_id = ?
    List<Actividad> findByMateriaIdAndTrimestreId(Long materiaId, Long trimestreId);
    
}
