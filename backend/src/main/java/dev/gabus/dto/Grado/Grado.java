package dev.gabus.dto.Grado;

import com.fasterxml.jackson.annotation.JsonIgnore;

import dev.gabus.dto.Usuario.Usuario;
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
@Table(name = "grado", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"nivel", "seccion"}) // Evita duplicados, ej. no puede haber dos "7mo A"
})
public class Grado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nivel; // Ejemplo: "7mo Grado", "8vo Grado", "1er Año"

    @Column(nullable = false)
    private String seccion; // Ejemplo: "A", "B", "Única"

    // (Opcional) Podemos añadir el año escolar si quieres mantener un historial
    @Column(name = "anio_escolar", nullable = false)
    private int anioEscolar; // Ejemplo: 2024, 2025

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "profesor_id")
    @JsonIgnore
    private Usuario profesor;

    // Más adelante, aquí podemos añadir la relación con Estudiantes
    // @OneToMany(mappedBy = "grado")
    // private List<Estudiante> estudiantes;
    
}
