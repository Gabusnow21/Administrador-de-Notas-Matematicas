package dev.gabus.dto.Ticket;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final DownloadTokenRepository repository;

    @Value("${report.boletas.path}")
    private String boletasPath;

    @Value("${report.boletas.expiration-hours:24}")
    private int expirationHours;

    public String getBoletasPath() {
        return boletasPath;
    }

    public void setBoletasPath(String boletasPath) {
        File folder = new File(boletasPath);
        if (!folder.exists() || !folder.isDirectory()) {
            throw new RuntimeException("La ruta no es válida: " + boletasPath);
        }
        this.boletasPath = boletasPath;
    }

    public List<String> listDirectories(String path) {
        File folder = new File(path);
        if (!folder.exists() || !folder.isDirectory()) {
            return new ArrayList<>();
        }
        File[] subdirs = folder.listFiles(File::isDirectory);
        List<String> names = new ArrayList<>();
        if (subdirs != null) {
            for (File d : subdirs) {
                names.add(d.getAbsolutePath());
            }
        }
        return names;
    }

    @Transactional
    public List<DownloadToken> generateTokens() {
        File folder = new File(boletasPath);
        if (!folder.exists() || !folder.isDirectory()) {
            throw new RuntimeException("La ruta de boletas no es válida: " + boletasPath);
        }

        File[] files = folder.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf") && name.startsWith("boleta_"));
        List<DownloadToken> tokens = new ArrayList<>();
        Pattern pattern = Pattern.compile("boleta_(\\d+)\\.pdf");

        if (files != null) {
            for (File file : files) {
                Matcher matcher = pattern.matcher(file.getName());
                if (matcher.find()) {
                    Integer listNumber = Integer.parseInt(matcher.group(1));
                    
                    // Opcional: Evitar duplicados si ya existe uno activo
                    Optional<DownloadToken> existing = repository.findByStudentListNumberAndIsUsedFalseAndExpiresAtAfter(listNumber, LocalDateTime.now());
                    if (existing.isPresent()) continue;

                    DownloadToken token = DownloadToken.builder()
                            .studentListNumber(listNumber)
                            .createdAt(LocalDateTime.now())
                            .expiresAt(LocalDateTime.now().plusHours(expirationHours))
                            .isUsed(false)
                            .build();
                    tokens.add(repository.save(token));
                }
            }
        }
        return tokens;
    }

    public Optional<UUID> validateToken(Integer studentListNumber) {
        return repository.findByStudentListNumberAndIsUsedFalseAndExpiresAtAfter(studentListNumber, LocalDateTime.now())
                .map(DownloadToken::getId);
    }

    @Transactional
    public File getFileByToken(UUID tokenId) {
        DownloadToken token = repository.findById(tokenId)
                .orElseThrow(() -> new RuntimeException("Token no encontrado o inválido"));

        if (token.getIsUsed() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("El token ha expirado o ya fue utilizado");
        }

        String fileName = "boleta_" + token.getStudentListNumber() + ".pdf";
        File file = new File(boletasPath, fileName);

        if (!file.exists()) {
            throw new RuntimeException("Archivo no encontrado en el servidor");
        }

        // Marcar como usado
        token.setIsUsed(true);
        repository.save(token);

        return file;
    }

    @Scheduled(cron = "0 0 0 * * *") // Cada 24 horas a media noche
    @Transactional
    public void cleanupTokens() {
        repository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
