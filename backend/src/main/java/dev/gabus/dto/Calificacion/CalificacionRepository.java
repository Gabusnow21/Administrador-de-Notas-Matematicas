package dev.gabus.dto.Calificacion;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CalificacionRepository extends JpaRepository<Calificacion, Long> {

    //Buscar todas las notas de un estudiante en un trimestre: SELECT * FROM _calificacion WHERE estudiante_id = ? AND trimestre_id = ?
    // List<Calificacion> findByEstudianteIdAndTrimestreId(Long estudianteId, Long trimestreId);

    //Buscar todas las notas de un estudiante especifico 
    List<Calificacion> findByEstudianteId(Long estudianteId);

    //Buscar todas las notas de una materia especifica
    // List<Calificacion> findByMateriaId(Long materiaId);

    //Buscar todas las notas de una actividad especifica
    List<Calificacion> findByActividadId(Long actividadId);

    //Buscar una nota especifica por estudiante y actividad
    Calificacion findByEstudianteIdAndActividadId(Long estudianteId, Long actividadId);

    //Buscar todas las notas en un trimestre especifico
    // List<Calificacion> findByTrimestreId(Long trimestreId);

    //Buscar todas las notas de un grado en un trimestre especifico
    // List<Calificacion> findByGradoIdAndTrimestreId(Long gradoId, Long trimestreId);

    //Buscar todas las notas de un grado especifico
    // List<Calificacion> findByGradoId(Long gradoId);

    //Buscar todas las notas de un grado en una materia especifica
    // List<Calificacion> findByGradoIdAndMateriaId(Long gradoId, Long materiaId);

    //Buscar todas las notas de un grado en una materia y trimestre especificos
    // List<Calificacion> findByGradoIdAndMateriaIdAndTrimestreId(Long gradoId, Long materiaId, Long trimestreId);

    //Buscar todas las notas de un grado en una actividad especifica
    // List<Calificacion> findByGradoIdAndActividadId(Long gradoId, Long actividadId);

    //Buscar todas las notas de un grado en una actividad y trimestre especificos
    // List<Calificacion> findByGradoIdAndActividadIdAndTrimestreId(Long gradoId, Long actividadId, Long trimestreId);

    //Buscar todas las notas de un estudiante en una materia especifica
    // List<Calificacion> findByEstudianteIdAndMateriaId(Long estudianteId, Long materiaId);

    //Buscar todas las notas de un estudiante en una materia y trimestre especificos
    // List<Calificacion> findByEstudianteIdAndMateriaIdAndTrimestreId(Long estudianteId, Long materiaId, Long trimestreId);

 
}
