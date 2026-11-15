package dev.gabus.dto.Configuracion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Plantilla de reporte (boleta) almacenada como JSON.
 *
 * Tabla dedicada porque el valor supera los 255 caracteres de
 * {@code configuracion_sistema.config_value} (incluye logotipos en base64).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "reporte_configuracion")
public class ReporteConfiguracion {

    /** Identificador lógico del registro (ej. REPORTE_BOLETA). */
    @Id
    @Column(name = "clave", nullable = false, length = 64)
    private String clave;

    /** JSON con la configuración completa del reporte. */
    @Column(name = "valor_json", columnDefinition = "TEXT")
    private String valorJson;
}
