package dev.gabus.dto.Configuracion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReporteConfiguracionRepository extends JpaRepository<ReporteConfiguracion, String> {
}
