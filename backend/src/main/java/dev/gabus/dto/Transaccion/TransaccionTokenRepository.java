package dev.gabus.dto.Transaccion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransaccionTokenRepository extends JpaRepository<TransaccionToken, Long> {
    List<TransaccionToken> findByEstudianteId(Long estudianteId);
}
