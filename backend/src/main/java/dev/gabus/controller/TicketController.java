package dev.gabus.controller;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.gabus.dto.Ticket.DownloadToken;
import dev.gabus.dto.Ticket.TicketService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping("/tickets/generate")
    public ResponseEntity<?> generateTickets() {
        return ResponseEntity.ok(ticketService.generateTokens());
    }

    @PostMapping("/tickets/validate")
    public ResponseEntity<?> validateTicket(@RequestBody Map<String, Integer> request) {
        Integer listNumber = request.get("studentListNumber");
        return ticketService.validateToken(listNumber)
                .map(uuid -> ResponseEntity.ok(Map.of("token", uuid.toString())))
                .orElse(ResponseEntity.status(404).body(Map.of("message", "No se encontró un token válido para este número de lista")));
    }

    @GetMapping("/download/{uuid}")
    public ResponseEntity<Resource> downloadFile(@PathVariable UUID uuid) {
        File file = ticketService.getFileByToken(uuid);
        Resource resource = new FileSystemResource(file);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    @GetMapping("/tickets/config/path")
    public ResponseEntity<?> getPath() {
        return ResponseEntity.ok(Map.of("path", ticketService.getBoletasPath()));
    }

    @PostMapping("/tickets/config/path")
    public ResponseEntity<?> setPath(@RequestBody Map<String, String> request) {
        String newPath = request.get("path");
        ticketService.setBoletasPath(newPath);
        List<DownloadToken> tokens = ticketService.generateTokens();
        return ResponseEntity.ok(Map.of(
            "message", "Ruta actualizada correctamente",
            "tokensGenerated", tokens.size()
        ));
    }

    @PostMapping("/tickets/config/list-dirs")
    public ResponseEntity<List<String>> listDirs(@RequestBody Map<String, String> request) {
        String path = request.get("path");
        return ResponseEntity.ok(ticketService.listDirectories(path));
    }

    @PostMapping("/tickets/upload")
    public ResponseEntity<?> uploadFiles(@RequestParam(value = "files", required = false) MultipartFile[] files) {
        try {
            if (files == null || files.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "No se recibieron archivos. Asegúrate de que el campo se llame 'files' y que hayas seleccionado una carpeta con archivos PDF."));
            }
            ticketService.saveUploadedFiles(files);
            List<DownloadToken> tokens = ticketService.generateTokens();
            return ResponseEntity.ok(Map.of(
                "message", "Archivos subidos y procesados correctamente. Se generaron " + tokens.size() + " tokens de descarga.",
                "tokensGenerated", tokens.size()
            ));
        } catch (Exception e) {
            e.printStackTrace(); // Para ver el error en los logs del servidor
            return ResponseEntity.badRequest().body(Map.of(
                "message", "Error al subir archivos: " + e.getMessage(),
                "error", e.getClass().getSimpleName()
            ));
        }
    }
}
