package dev.gabus.dto.Estudiante;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import dev.gabus.dto.Grado.Grado;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(name = "estudiante", indexes = {
    @Index(name = "idx_codigo_progreso", columnList = "codigo_progreso", unique = true)
})
public class Estudiante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombres;

    @Column(nullable = false)
    private String apellidos;

    @Column(name="email", nullable = true, unique = true)
    private String email;

    @Column(name="codigo_progreso", unique = true, nullable = false, length = 8)
    private String codigoProgreso;

    @Column(unique = true)
    private String nfcId;

    @Column(nullable = false)
    @Builder.Default
    private Integer saldoTokens = 0;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "grado_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler","profesor"})
    private Grado grado;

}
