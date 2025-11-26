package dev.gabus.dto.Reporte;

import dev.gabus.dto.Calificacion.Calificacion;
import dev.gabus.dto.Calificacion.CalificacionRepository;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Reporte.ReporteCalificacionDTO;
import dev.gabus.dto.Materia.Materia;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import java.io.File;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@lombok.RequiredArgsConstructor
public class ReporteService {
    private final CalificacionRepository calificacionRepository;
    private final EstudianteRepository estudianteRepository;

    public byte[] generarBoletin(Long estudianteId) throws Exception {
        
        var estudiante = estudianteRepository.findById(estudianteId)
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado"));

        // 1. Traer TODAS las notas del estudiante
        List<Calificacion> todasLasNotas = calificacionRepository.findByEstudianteId(estudianteId);

        // 2. Agrupar notas por Materia
        Map<Materia, List<Calificacion>> notasPorMateria = todasLasNotas.stream()
                .collect(Collectors.groupingBy(c -> c.getActividad().getMateria()));

        // 3. Construir la lista para el reporte (Filas)
        List<ReporteCalificacionDTO> filasReporte = new ArrayList<>();

        for (Map.Entry<Materia, List<Calificacion>> entry : notasPorMateria.entrySet()) {
            Materia materia = entry.getKey();
            List<Calificacion> notas = entry.getValue();

            // Calcular promedio por trimestre (usando Streams y filtros)
            BigDecimal t1 = calcularPromedioTrimestre(notas, "Trimestre 1");
            BigDecimal t2 = calcularPromedioTrimestre(notas, "Trimestre 2");
            BigDecimal t3 = calcularPromedioTrimestre(notas, "Trimestre 3");

            // Totales
            BigDecimal total = t1.add(t2).add(t3);
            BigDecimal promedio = total.divide(BigDecimal.valueOf(3), 0, RoundingMode.HALF_UP); // Redondeo entero como la imagen

            filasReporte.add(new ReporteCalificacionDTO(
                    materia.getNombre(),
                    t1, t2, t3, total, promedio
            ));
        }

        // 4. Compilar Reporte
        File file = ResourceUtils.getFile("classpath:reports/boletin.jrxml");
        JasperReport jasperReport = JasperCompileManager.compileReport(file.getAbsolutePath());

        Map<String, Object> parametros = new HashMap<>();
        parametros.put("nombreEstudiante", estudiante.getApellido() + " " + estudiante.getNombre()); // Formato: Apellido Nombre

        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(filasReporte);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parametros, dataSource);

        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    // Helper para calcular promedio
    private BigDecimal calcularPromedioTrimestre(List<Calificacion> notas, String nombreTrimestre) {
        List<BigDecimal> notasDelTrimestre = notas.stream()
                .filter(n -> n.getActividad().getTrimestre().getNombre().equalsIgnoreCase(nombreTrimestre))
                .map(Calificacion::getNota)
                .collect(Collectors.toList());

        if (notasDelTrimestre.isEmpty()) return BigDecimal.ZERO;

        BigDecimal suma = notasDelTrimestre.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        // Retornamos promedio redondeado a entero (como en la imagen: 9, 10, 8)
        return suma.divide(BigDecimal.valueOf(notasDelTrimestre.size()), 0, RoundingMode.HALF_UP);
    }
    
}
