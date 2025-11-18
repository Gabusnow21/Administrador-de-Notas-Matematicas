package dev.gabus.dto.Actividad;

import dev.gabus.dto.Materia.*;
import dev.gabus.dto.Trimestre.*;

import java.math.BigDecimal;
import java.time.LocalDate;

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
@Table(name = "actividad", uniqueConstraints = {
    // Evita crear "Examen 1" dos veces para la misma materia en el mismo trimestre
    @UniqueConstraint(columnNames = {"nombre", "materia_id", "trimestre_id"})
})
public class Actividad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre; // Ejemplo: "Examen Parcial 1", "Tarea 5", "Proyecto Final"

    @Column(nullable = true)
    private String descripcion;

    // Usamos BigDecimal para la ponderación (ej. 0.20 para 20%, 0.15 para 15%)
    // precision=5, scale=2 significa hasta 999.99 (ej. 1.00 = 100%)
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal ponderacion; 

    @Column(name = "fecha_actividad", nullable = true)
    private LocalDate fechaActividad; // Fecha en que se realizó o entregó

    // --- Relación con Materia ---
    // Muchas actividades pertenecen a Una Materia
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "materia_id", nullable = false)
    private Materia materia;

    // --- Relación con Trimestre ---
    // Muchas actividades se realizan en Un Trimestre
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trimestre_id", nullable = false)
    private Trimestre trimestre;
    
}
