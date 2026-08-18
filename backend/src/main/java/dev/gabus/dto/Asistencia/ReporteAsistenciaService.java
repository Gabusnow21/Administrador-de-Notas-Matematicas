package dev.gabus.dto.Asistencia;

import dev.gabus.dto.Grado.Grado;
import dev.gabus.dto.Grado.GradoRepository;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import javax.imageio.ImageIO;
import java.awt.Image;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReporteAsistenciaService {

    private final AsistenciaRepository asistenciaRepository;
    private final GradoRepository gradoRepository;

    public byte[] generarReporteMensual(Long gradoId, int month, int year) throws Exception {
        System.setProperty("java.awt.headless", "true");

        List<AsistenciaReporteDTO> data = asistenciaRepository.getReporteAsistenciaMensual(gradoId, month, year);
        Grado grado = gradoRepository.findById(gradoId).orElseThrow(() -> new RuntimeException("Grado no encontrado"));


        InputStream reportStream = getClass().getClassLoader().getResourceAsStream("reports/reporte_asistencia.jrxml");
        if (reportStream == null) {
            throw new IllegalStateException("No se pudo encontrar la plantilla del reporte: reports/reporte_asistencia.jrxml");
        }
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);

        Image leftLogo = null;
        try (InputStream leftLogoStream = getClass().getClassLoader().getResourceAsStream("images/logoizquierda.png")) {
            if(leftLogoStream != null) leftLogo = ImageIO.read(leftLogoStream);
        }

        Image rightLogo = null;
        try (InputStream rightLogoStream = getClass().getClassLoader().getResourceAsStream("images/logoderecha.png")) {
            if(rightLogoStream != null) rightLogo = ImageIO.read(rightLogoStream);
        }

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("paramLeftLogo", leftLogo);
        parameters.put("paramRightLogo", rightLogo);
        parameters.put("grado", grado.getNivel() + " '" + grado.getSeccion() + "'");
        parameters.put("mes", getMonthName(month));
        parameters.put("anio", String.valueOf(year));
        parameters.put("fechaGeneracion", new java.util.Date());

        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(data);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    private String getMonthName(int month) {
        String[] monthNames = {"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"};
        return monthNames[month - 1];
    }
}
