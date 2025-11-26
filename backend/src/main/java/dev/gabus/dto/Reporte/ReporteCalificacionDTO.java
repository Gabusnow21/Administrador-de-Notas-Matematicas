package dev.gabus.dto.Reporte;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReporteCalificacionDTO {
    private String asignatura;    // Ej: "Informática"
    private BigDecimal notaT1;    // Ej: 9
    private BigDecimal notaT2;    // Ej: 10
    private BigDecimal notaT3;    // Ej: 9
    private BigDecimal totalPuntos; // Ej: 28 (Suma de T1+T2+T3)
    private BigDecimal promedioFinal; // Ej: 9 (Total / 3)
    
}
