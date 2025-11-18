package dev.gabus.dto.Materia;

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
@Table(name = "materia", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"nombre"}) // Asegura que no puedas crear "Matemáticas" dos veces
})
public class Materia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    // (Opcional) Una breve descripción de la materia
    @Column(nullable = true)
    private String descripcion;

    // Más adelante, esta entidad tendrá relaciones complejas.
    // Por ejemplo, una Materia puede estar en muchos Grados
    // y un Grado puede tener muchas Materias (una relación @ManyToMany).
    // También, las Actividades pertenecerán a una Materia.
    
}
