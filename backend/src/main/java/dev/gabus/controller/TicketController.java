package dev.gabus.controller;

import dev.gabus.dto.Ticket.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.Map;
import java.util.UUID;
import java.util.List;

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
        return ResponseEntity.ok(Map.of("message", "Ruta actualizada correctamente"));
    }

    @PostMapping("/tickets/config/list-dirs")
    public ResponseEntity<List<String>> listDirs(@RequestBody Map<String, String> request) {
        String path = request.get("path");
        return ResponseEntity.ok(ticketService.listDirectories(path));
    }
}
