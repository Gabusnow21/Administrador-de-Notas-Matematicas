package dev.gabus.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.gabus.dto.Actividad.Actividad;
import dev.gabus.dto.Actividad.ActividadRepository;
import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Materia.Materia;
import dev.gabus.dto.Materia.MateriaRepository;
import dev.gabus.dto.Reporte.ReporteService;
import dev.gabus.dto.Ticket.BoletaDataDTO;
import dev.gabus.dto.Trimestre.Trimestre;
import dev.gabus.dto.Trimestre.TrimestreRepository;
import dev.gabus.dto.Calificacion.Calificacion;
import dev.gabus.dto.Calificacion.CalificacionRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final EstudianteRepository estudianteRepository;
    private final ReporteService reporteService;
    private final CalificacionRepository calificacionRepository;
    private final ActividadRepository actividadRepository;
    private final MateriaRepository materiaRepository;
    private final TrimestreRepository trimestreRepository;

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

    // Entrega los datos del estudiante por NIE para que el frontend
    // genere el boletin completo (notas + conducta) con jsPDF.
    @GetMapping("/data/{nie}")
    public ResponseEntity<?> getBoletaData(@PathVariable String nie) {
        if (nie == null || nie.length() != 8) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Estudiante estudiante = estudianteRepository.findByCodigoProgreso(nie)
                    .orElse(null);
            if (estudiante == null) {
                return ResponseEntity.notFound().build();
            }

            List<Calificacion> calificaciones = calificacionRepository.findByEstudianteId(estudiante.getId());

            List<Long> actividadIds = calificaciones.stream()
                    .map(c -> c.getActividad().getId())
                    .distinct()
                    .toList();

            List<Actividad> actividades = actividadRepository.findAllById(actividadIds);

            List<Long> materiaIds = actividades.stream()
                    .map(a -> a.getMateria().getId())
                    .distinct()
                    .toList();

            List<Long> trimestreIds = actividades.stream()
                    .map(a -> a.getTrimestre().getId())
                    .distinct()
                    .toList();

            BoletaDataDTO datos = new BoletaDataDTO(
                new BoletaDataDTO.EstudianteDTO(
                    estudiante.getNombres(),
                    estudiante.getApellidos(),
                    estudiante.getCodigoProgreso()
                ),
                calificaciones.stream()
                    .map(c -> new BoletaDataDTO.CalificacionDTO(c.getNota(), c.getActividad().getId()))
                    .toList(),
                actividades.stream()
                    .map(a -> new BoletaDataDTO.ActividadDTO(
                        a.getId(),
                        a.getNombre(),
                        a.getPonderacion(),
                        a.getMateria().getId(),
                        a.getTrimestre().getId()
                    ))
                    .toList(),
                materiaRepository.findAllById(materiaIds).stream()
                    .map((Materia m) -> new BoletaDataDTO.MateriaDTO(m.getId(), m.getNombre()))
                    .toList(),
                trimestreRepository.findAllById(trimestreIds).stream()
                    .map((Trimestre t) -> new BoletaDataDTO.TrimestreDTO(t.getId()))
                    .toList()
            );

            return ResponseEntity.ok(datos);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
