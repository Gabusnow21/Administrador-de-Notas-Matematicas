package dev.gabus.dto.Reporte;

import dev.gabus.dto.Calificacion.Calificacion;
import dev.gabus.dto.Calificacion.CalificacionRepository;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Materia.Materia;
import dev.gabus.dto.Reporte.ReporteCalificacionDTO;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import javax.imageio.ImageIO;
import java.awt.Image;
import java.io.File;
import java.io.InputStream;
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
        
        System.setProperty("java.awt.headless", "true");

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
            BigDecimal promedio = total.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP); // Redondeo a 2 decimales

            filasReporte.add(new ReporteCalificacionDTO(
                    materia.getNombre(),
                    t1, t2, t3, total, promedio
            ));
        }

        // 4. Cargar imágenes y compilar reporte
        InputStream reportStream = ReporteService.class.getClassLoader().getResourceAsStream("reports/boletin.jrxml");
        if (reportStream == null) {
            throw new IllegalStateException("No se pudo encontrar la plantilla del reporte: reports/boletin.jrxml");
        }
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);

        Image leftLogo = null;
        try (InputStream leftLogoStream = ReporteService.class.getClassLoader().getResourceAsStream("images/logoizquierda.png")) {
            if (leftLogoStream == null) {
                System.out.println("ADVERTENCIA DE DIAGNÓSTICO: No se pudo encontrar el recurso 'images/logoizquierda.png' en el classpath.");
            } else {
                leftLogo = ImageIO.read(leftLogoStream);
                if (leftLogo == null) {
                    System.out.println("ADVERTENCIA DE DIAGNÓSTICO: Se encontró 'images/logoizquierda.png', pero no se pudo leer (formato inválido o archivo corrupto).");
                }
            }
        } catch (java.io.IOException e) {
            System.err.println("ERROR DE DIAGNÓSTICO al leer el logo izquierdo: " + e.getMessage());
        }

        Image rightLogo = null;
        try (InputStream rightLogoStream = ReporteService.class.getClassLoader().getResourceAsStream("images/logoderecha.png")) {
            if (rightLogoStream == null) {
                System.out.println("ADVERTENCIA DE DIAGNÓSTICO: No se pudo encontrar el recurso 'images/logoderecha.png' en el classpath.");
            } else {
                rightLogo = ImageIO.read(rightLogoStream);
                if (rightLogo == null) {
                    System.out.println("ADVERTENCIA DE DIAGNÓSTICO: Se encontró 'images/logoderecha.png', pero no se pudo leer (formato inválido o archivo corrupto).");
                }
            }
        } catch (java.io.IOException e) {
            System.err.println("ERROR DE DIAGNÓSTICO al leer el logo derecho: " + e.getMessage());
        }

        Map<String, Object> parametros = new HashMap<>();
        parametros.put("nombreEstudiante", estudiante.getApellidos() + " " + estudiante.getNombres()); // Formato: Apellido Nombre
        parametros.put("paramLeftLogo", leftLogo);
        parametros.put("paramRightLogo", rightLogo);


        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(filasReporte);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parametros, dataSource);

        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    // Helper para calcular promedio ponderado
    private BigDecimal calcularPromedioTrimestre(List<Calificacion> notas, String nombreTrimestre) {
        // 1. Filtrar las calificaciones que pertenecen al trimestre especificado
        List<Calificacion> notasDelTrimestre = notas.stream()
            .filter(n -> n.getActividad().getTrimestre().getNombre().equalsIgnoreCase(nombreTrimestre))
            .collect(Collectors.toList());
    
        // Si no hay notas, el promedio es 0
        if (notasDelTrimestre.isEmpty()) {
            return BigDecimal.ZERO;
        }
    
        BigDecimal sumaPonderada = BigDecimal.ZERO;
        BigDecimal sumaDePonderaciones = BigDecimal.ZERO;
    
        // 2. Calcular la suma de las notas multiplicadas por su ponderación
        for (Calificacion calificacion : notasDelTrimestre) {
            BigDecimal nota = calificacion.getNota();
            BigDecimal ponderacion = calificacion.getActividad().getPonderacion();
            
            sumaPonderada = sumaPonderada.add(nota.multiply(ponderacion));
            sumaDePonderaciones = sumaDePonderaciones.add(ponderacion);
        }
    
        // 3. Evitar división por cero si la suma de ponderaciones es 0
        if (sumaDePonderaciones.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
    
        // 4. Calcular el promedio ponderado y redondear a 2 decimales
        return sumaPonderada.divide(sumaDePonderaciones, 2, RoundingMode.HALF_UP);
    }
    
}
