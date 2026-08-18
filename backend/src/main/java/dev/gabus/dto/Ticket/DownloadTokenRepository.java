package dev.gabus.dto.Ticket;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DownloadTokenRepository extends JpaRepository<DownloadToken, UUID> {
    Optional<DownloadToken> findByNieAndIsUsedFalseAndExpiresAtAfter(String nie, LocalDateTime now);
    Optional<DownloadToken> findByStudentListNumberAndIsUsedFalseAndExpiresAtAfter(Integer studentListNumber, LocalDateTime now);
    List<DownloadToken> findAllByExpiresAtBefore(LocalDateTime now);
    void deleteByExpiresAtBefore(LocalDateTime now);
}
