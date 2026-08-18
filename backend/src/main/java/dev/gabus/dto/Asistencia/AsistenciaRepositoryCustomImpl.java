package dev.gabus.dto.Asistencia;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;

public class AsistenciaRepositoryCustomImpl implements AsistenciaRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<AsistenciaReporteDTO> getReporteAsistenciaMensual(Long gradoId, int month, int year) {
        String query = "SELECT new dev.gabus.dto.Asistencia.AsistenciaReporteDTO(e.codigoProgreso, CONCAT(e.nombres, ' ', e.apellidos), COUNT(a)) " +
                       "FROM Asistencia a JOIN a.estudiante e " +
                       "WHERE e.grado.id = :gradoId AND EXTRACT(MONTH FROM a.fecha) = :month AND EXTRACT(YEAR FROM a.fecha) = :year " +
                       "AND a.estado = :estado " +
                       "GROUP BY e.id, e.codigoProgreso, e.nombres, e.apellidos " +
                       "ORDER BY e.apellidos";

        return entityManager.createQuery(query, AsistenciaReporteDTO.class)
                .setParameter("gradoId", gradoId)
                .setParameter("month", month)
                .setParameter("year", year)
                .setParameter("estado", EstadoAsistencia.PRESENTE)
                .getResultList();
    }
}
