package dev.gabus.controller;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Reporte.ReporteService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final EstudianteRepository estudianteRepository;
    private final ReporteService reporteService;

    @GetMapping("/check-nie/{nie}")
    public ResponseEntity<?> checkNie(@PathVariable String nie) {
        if (nie == null || nie.length() != 8) {
            return ResponseEntity.badRequest().body(Map.of(
                "available", false,
                "message", "El NIE debe tener exactamente 8 dígitos"
            ));
        }
        return estudianteRepository.findByCodigoProgreso(nie)
                .map(est -> ResponseEntity.ok(Map.of(
                    "available", true,
                    "nombre", est.getApellidos() + " " + est.getNombres(),
                    "message", "Boleta disponible"
                )))
                .orElse(ResponseEntity.ok(Map.of(
                    "available", false,
                    "message", "No se encontró un estudiante con este NIE"
                )));
    }

    @GetMapping("/download/{nie}")
    public ResponseEntity<byte[]> downloadBoleta(@PathVariable String nie) {
        if (nie == null || nie.length() != 8) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Estudiante estudiante = estudianteRepository.findByCodigoProgreso(nie)
                    .orElse(null);
            if (estudiante == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] pdfBytes = reporteService.generarBoletin(estudiante.getId());
            String fileName = "boleta_" + nie + ".pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
