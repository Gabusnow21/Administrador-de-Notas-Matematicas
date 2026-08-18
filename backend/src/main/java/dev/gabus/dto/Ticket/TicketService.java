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
import java.util.Map;
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

    private static final Pattern NIE_PATTERN = Pattern.compile("(\\d{8})");
    private static final int NIE_LENGTH = 8;

    public String getBoletasPath() {
        return boletasPath;
    }

    public void setBoletasPath(String boletasPath) {
        if (boletasPath == null || boletasPath.trim().isEmpty()) {
            throw new RuntimeException("La ruta de boletas no puede estar vacía.");
        }
        File folder = new File(boletasPath);
        if (!folder.exists()) {
            if (!folder.mkdirs()) {
                throw new RuntimeException("No se pudo crear la ruta: " + boletasPath);
            }
        }
        this.boletasPath = boletasPath;
    }

    public List<String> listDirectories(String path) {
        if (path == null || path.trim().isEmpty()) return new ArrayList<>();
        Path normalizedPath = Paths.get(path).normalize();
        if (normalizedPath.toString().contains("..")) return new ArrayList<>();
        File folder = normalizedPath.toFile();
        if (!folder.exists() || !folder.isDirectory()) return new ArrayList<>();
        File[] subdirs = folder.listFiles(File::isDirectory);
        List<String> names = new ArrayList<>();
        if (subdirs != null) {
            for (File d : subdirs) names.add(d.getAbsolutePath());
        }
        return names;
    }

    public void saveUploadedFiles(MultipartFile[] files) throws IOException {
        File folder = new File(boletasPath);
        if (!folder.exists()) folder.mkdirs();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null && originalFilename.toLowerCase().endsWith(".pdf")) {
                String fileName = new File(originalFilename).getName();
                Path path = Paths.get(boletasPath, fileName);
                Files.copy(file.getInputStream(), path, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
        }
    }

    public void saveUploadedFilesWithNie(MultipartFile[] files, Map<String, String> nieMap) throws IOException {
        File folder = new File(boletasPath);
        if (!folder.exists()) folder.mkdirs();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) continue;

            String nie = nieMap.get(originalFilename);
            if (nie == null || nie.trim().isEmpty()) {
                nie = extractNieFromFilename(originalFilename);
            }

            String baseName = getBaseNameWithoutExtension(originalFilename);
            String targetName;
            if (nie != null && nie.length() == NIE_LENGTH) {
                targetName = nie + "_" + baseName + ".pdf";
            } else {
                targetName = baseName + ".pdf";
            }

            Path path = Paths.get(boletasPath, targetName);
            Files.copy(file.getInputStream(), path, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
    }

    @Transactional
    public List<DownloadToken> generateTokens() {
        File folder = new File(boletasPath);
        if (!folder.exists() || !folder.isDirectory()) {
            return new ArrayList<>();
        }

        File[] files = folder.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));
        if (files == null || files.length == 0) {
            return new ArrayList<>();
        }

        List<DownloadToken> tokens = new ArrayList<>();

        for (File file : files) {
            String name = file.getName();
            String nie = extractNieFromFilename(name);

            if (nie == null) continue;

            Optional<DownloadToken> existing = repository.findByNieAndIsUsedFalseAndExpiresAtAfter(nie, LocalDateTime.now());

            if (existing.isPresent()) {
                continue;
            }

            DownloadToken token = DownloadToken.builder()
                    .nie(nie)
                    .createdAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusHours(expirationHours))
                    .isUsed(false)
                    .build();
            tokens.add(repository.save(token));
        }
        return tokens;
    }

    public Optional<DownloadToken> validateToken(String nie) {
        if (nie == null || nie.length() != NIE_LENGTH) {
            return Optional.empty();
        }
        return repository.findByNieAndIsUsedFalseAndExpiresAtAfter(nie, LocalDateTime.now());
    }

    public Optional<DownloadToken> checkNieAvailability(String nie) {
        if (nie == null || nie.length() != NIE_LENGTH) {
            return Optional.empty();
        }
        return repository.findByNieAndIsUsedFalseAndExpiresAtAfter(nie, LocalDateTime.now());
    }

    @Transactional
    public File getFileByToken(UUID tokenId) {
        DownloadToken token = repository.findById(tokenId)
                .orElseThrow(() -> new RuntimeException("Token no encontrado o inválido"));

        if (token.getIsUsed() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("El token ha expirado o ya fue utilizado");
        }

        File folder = new File(boletasPath);
        File[] matches = folder.listFiles((dir, name) ->
            name.toLowerCase().endsWith(".pdf") && name.contains(token.getNie())
        );

        if (matches == null || matches.length == 0) {
            throw new RuntimeException("Archivo físico no encontrado para el NIE " + token.getNie());
        }

        token.setIsUsed(true);
        repository.save(token);

        return matches[0];
    }

    private String extractNieFromFilename(String filename) {
        Matcher matcher = NIE_PATTERN.matcher(filename);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String getBaseNameWithoutExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupTokens() {
        repository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
