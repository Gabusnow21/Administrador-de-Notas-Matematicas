package dev.gabus.dto.Administracion;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
@Table(name = "auditoria_baja", indexes = {
    @Index(name = "idx_auditoria_tipo_registro", columnList = "tipo, registro_id"),
    @Index(name = "idx_auditoria_fecha", columnList = "fecha")
})
public class AuditoriaBaja {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoRegistro tipo;

    @Column(name = "registro_id", nullable = false)
    private Long registroId;

    @Column(name = "nombre_registro", nullable = false)
    private String nombreRegistro;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccionBaja accion;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(name = "ejecutado_por_id", nullable = false)
    private Long ejecutadoPorId;

    @Column(name = "ejecutado_por_nombre", nullable = false)
    private String ejecutadoPorNombre;
}
