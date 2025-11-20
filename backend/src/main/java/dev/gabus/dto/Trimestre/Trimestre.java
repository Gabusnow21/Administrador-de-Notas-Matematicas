package dev.gabus.dto.Trimestre;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "trimestre", uniqueConstraints = {
    // Evita crear "Trimestre 1" dos veces para el mismo año escolar
    @UniqueConstraint(columnNames = {"nombre", "anio_escolar"}) 
})
public class Trimestre {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String nombre; // Ejemplo: "Trimestre 1", "Trimestre 2", "Trimestre 3"

    @Column(name = "anio_escolar", nullable = false)
    private int anioEscolar; // Ejemplo: 2024, 2025

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio; // Fecha de inicio del trimestre

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin; // Fecha de cierre del trimestre

    // (Opcional) Para saber si el trimestre está cerrado para notas
    @Builder.Default
    @Column(name = "esta_activo", nullable = false)
    private boolean activo = true;
    
}
