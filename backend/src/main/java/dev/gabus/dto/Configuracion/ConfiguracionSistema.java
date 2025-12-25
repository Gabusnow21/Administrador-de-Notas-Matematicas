package dev.gabus.dto.Configuracion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "configuracion_sistema")
public class ConfiguracionSistema {
    @Id
    @Column(name = "config_key", unique = true, nullable = false)
    private String key;

    @Column(name = "config_value")
    private String value;
}
