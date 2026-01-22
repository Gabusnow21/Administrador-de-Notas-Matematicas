package dev.gabus.dto.Asistencia;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AsistenciaReporteDTO {
    private String codigoProgreso;
    private String nombreEstudiante;
    private Long totalAsistencias;
}
