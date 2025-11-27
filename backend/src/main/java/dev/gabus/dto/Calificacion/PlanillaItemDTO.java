package dev.gabus.dto.Calificacion;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlanillaItemDTO {
    private Long estudianteId;
    private String nombreEstudiante;
    private String apellidoEstudiante;
    private Long calificacionId; // Será null si no tiene nota aún
    private BigDecimal nota;
    private String observacion;
}
