package dev.gabus.dto.Trimestre;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrimestreRepository extends JpaRepository<Trimestre, Long> {
    //Busca trimestres por anioEscolar 
    List<Trimestre> findByAnioEscolar(int anioEscolar);
    
}
