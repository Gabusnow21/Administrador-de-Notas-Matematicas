package dev.gabus.dto.Recompensa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecompensaRepository extends JpaRepository<Recompensa, Long> {
    Optional<Recompensa> findByNombre(String nombre);
}
