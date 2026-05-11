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
            if (!folder.mkdirs()) {
                throw new RuntimeException("No se pudo crear la ruta: " + boletasPath);
            }
        }
        this.boletasPath = boletasPath;
    }

    public List<String> listDirectories(String path) {
        if (path == null || path.trim().isEmpty()) return new ArrayList<>();
        File folder = new File(path);
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

    @Transactional
    public List<DownloadToken> generateTokens() {
        System.out.println("DEBUG: Iniciando generación de tokens en: " + boletasPath);
        File folder = new File(boletasPath);
        if (!folder.exists() || !folder.isDirectory()) {
            System.out.println("DEBUG: La carpeta no existe o no es un directorio.");
            return new ArrayList<>();
        }

        File[] files = folder.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));
        if (files == null || files.length == 0) {
            System.out.println("DEBUG: No se encontraron archivos PDF en la carpeta.");
            return new ArrayList<>();
        }
        System.out.println("DEBUG: Se encontraron " + files.length + " archivos PDF.");

        List<DownloadToken> tokens = new ArrayList<>();
        // Patrón muy flexible: busca cualquier número en el nombre del archivo
        Pattern pattern = Pattern.compile("(\\d+)"); 

        for (File file : files) {
            String name = file.getName();
            Matcher matcher = pattern.matcher(name);
            
            if (matcher.find()) {
                try {
                    Integer listNumber = Integer.parseInt(matcher.group(1));
                    System.out.println("DEBUG: Procesando archivo " + name + " como número de lista " + listNumber);
                    
                    // Comprobar si ya existe un token activo (no usado y no expirado)
                    Optional<DownloadToken> existing = repository.findByStudentListNumberAndIsUsedFalseAndExpiresAtAfter(listNumber, LocalDateTime.now());
                    
                    if (existing.isPresent()) {
                        System.out.println("DEBUG: Ya existe un token activo para el número " + listNumber + ". Saltando...");
                        continue;
                    }

                    DownloadToken token = DownloadToken.builder()
                            .studentListNumber(listNumber)
                            .createdAt(LocalDateTime.now())
                            .expiresAt(LocalDateTime.now().plusHours(expirationHours))
                            .isUsed(false)
                            .build();
                    tokens.add(repository.save(token));
                    System.out.println("DEBUG: Token generado para número " + listNumber);
                } catch (NumberFormatException e) {
                    System.out.println("DEBUG: No se pudo extraer un número válido de " + name);
                }
            } else {
                System.out.println("DEBUG: El archivo " + name + " no contiene un número de lista.");
            }
        }
        System.out.println("DEBUG: Total de tokens generados en esta tanda: " + tokens.size());
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

        // Buscar el archivo físico que contenga el número de lista
        File folder = new File(boletasPath);
        File[] matches = folder.listFiles((dir, name) -> 
            name.toLowerCase().endsWith(".pdf") && name.contains(String.valueOf(token.getStudentListNumber()))
        );

        if (matches == null || matches.length == 0) {
            throw new RuntimeException("Archivo físico no encontrado para el número " + token.getStudentListNumber());
        }

        // Marcar como usado
        token.setIsUsed(true);
        repository.save(token);

        return matches[0]; // Retornar el primero que coincida
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupTokens() {
        repository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}
