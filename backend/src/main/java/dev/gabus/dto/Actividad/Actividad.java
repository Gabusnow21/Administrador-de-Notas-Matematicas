package dev.gabus.dto.Actividad;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;

import dev.gabus.dto.Materia.Materia;
import dev.gabus.dto.Trimestre.Trimestre;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
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
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "materia_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    private Materia materia;

    // --- Relación con Trimestre ---
    // Muchas actividades se realizan en Un Trimestre
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "trimestre_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    private Trimestre trimestre;
    
    // --- Relación Padre-Hijo (Auto-referencia) ---

    // Muchas sub-actividades pueden pertenecer a una actividad padre
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonBackReference // Evita recursión infinita al serializar a JSON
    @ToString.Exclude
    private Actividad parent;

    // Una actividad padre puede tener muchas sub-actividades
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference // Evita recursión infinita
    @ToString.Exclude
    private Set<Actividad> subActividades;

    // Campo para indicar si esta actividad promedia las notas de sus hijas
    @Column(name = "promedia", nullable = false, columnDefinition = "boolean default false")
    private boolean promedia;


    @JsonProperty("parentId")
    public Long getParentId() {
        if (parent != null) {
            return parent.getId();
        }
        return null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Actividad)) return false;
        Actividad actividad = (Actividad) o;
        return id != null && Objects.equals(id, actividad.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
