package dev.gabus.dto.Ticket;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
        if (boletasPath == null || boletasPath.trim().isEmpty()) {
            throw new RuntimeException("La ruta de boletas no puede estar vacía.");
        }
        File folder = new File(boletasPath);
        if (!folder.exists()) {
            // Intentar crear el directorio si no existe
            if (!folder.mkdirs()) {
                throw new RuntimeException("La ruta no existe y no se pudo crear: " + boletasPath);
            }
        }
        if (!folder.isDirectory()) {
            throw new RuntimeException("La ruta especificada no es un directorio: " + boletasPath);
        }
        this.boletasPath = boletasPath;
    }

    public List<String> listDirectories(String path) {
        if (path == null || path.trim().isEmpty()) {
            return new ArrayList<>();
        }
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

    public void saveUploadedFiles(MultipartFile[] files) throws IOException {
        File folder = new File(boletasPath);
        if (!folder.exists()) {
            folder.mkdirs();
        }

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            
            // Solo guardamos si es PDF
            String fileName = file.getOriginalFilename();
            if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
                Path path = Paths.get(boletasPath, fileName);
                Files.copy(file.getInputStream(), path, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
        }
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
