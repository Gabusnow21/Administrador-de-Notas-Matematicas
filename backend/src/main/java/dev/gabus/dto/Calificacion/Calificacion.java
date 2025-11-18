package dev.gabus.dto.Calificacion;

import dev.gabus.dto.Actividad.*;
import dev.gabus.dto.Estudiante.*;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "calificacion", uniqueConstraints = {
    // Regla de negocio CLAVE:
    // Un estudiante solo puede tener UNA calificación por actividad.
    @UniqueConstraint(columnNames = {"estudiante_id", "actividad_id"})
})
public class Calificacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // La nota obtenida. Ej. 8.5, 9.2, 10.0
    // precision=5, scale=2 permite números como 100.00 o 9.75
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal nota;

    // (Opcional) Un comentario sobre la calificación
    @Column(nullable = true)
    private String observacion;

    // --- Relación con Estudiante ---
    // Muchas calificaciones pertenecen a Un Estudiante
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private Estudiante estudiante;

    // --- Relación con Actividad ---
    // Muchas calificaciones están asociadas a Una Actividad
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actividad_id", nullable = false)
    private Actividad actividad;
}
