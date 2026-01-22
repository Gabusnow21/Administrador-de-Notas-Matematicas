package dev.gabus.dto.Asistencia;

import java.util.List;

public interface AsistenciaRepositoryCustom {
    List<AsistenciaReporteDTO> getReporteAsistenciaMensual(Long gradoId, int month, int year);
}
