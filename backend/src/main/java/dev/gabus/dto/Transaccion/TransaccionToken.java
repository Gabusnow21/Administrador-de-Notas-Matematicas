package dev.gabus.dto.Transaccion;

import dev.gabus.dto.Estudiante.Estudiante;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "transaccion_token")
public class TransaccionToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "estudiante_id", nullable = false)
    private Estudiante estudiante;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoTransaccion tipo;

    @Column(nullable = false)
    private Integer monto; // Cantidad de tokens añadidos o gastados

    @Column(nullable = false)
    private String descripcion; // Ej: "Canje de recompensa: Lápiz" o "Bonificación por participación"

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;

    public enum TipoTransaccion {
        ACUMULACION, // Ganar tokens
        CANJE       // Gastar tokens
    }
}
