package dev.gabus.dto.Administracion;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditoriaBajaRepository extends JpaRepository<AuditoriaBaja, Long>, JpaSpecificationExecutor<AuditoriaBaja> {
    List<AuditoriaBaja> findAllByOrderByFechaDesc();
}
