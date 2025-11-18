package dev.gabus.dto.Estudiante;

import dev.gabus.dto.Grado.Grado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "estudiante")
public class Estudiante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    // (Opcional) Puedes añadir más campos si los necesitas, ej:
    // private String codigoEstudiante;
    // private String emailAcudiente;

    // --- Relación con Grado ---
    // Muchos estudiantes pueden pertenecer a Un Grado.
    @ManyToOne(fetch = FetchType.LAZY) // LAZY = Solo carga el Grado cuando se acceda a él
    @JoinColumn(name = "grado_id", nullable = false) // Esta será la columna FK en la tabla 'estudiante'
    private Grado grado;

    // Más adelante, aquí podemos añadir la relación con Calificaciones
    // @OneToMany(mappedBy = "estudiante")
    // private List<Calificacion> calificaciones;

    
}
