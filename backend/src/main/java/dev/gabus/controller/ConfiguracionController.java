package dev.gabus.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.gabus.dto.Configuracion.ConfiguracionSistema;
import dev.gabus.dto.Configuracion.ConfiguracionSistemaRepository;
import dev.gabus.dto.Configuracion.ReporteConfiguracion;
import dev.gabus.dto.Configuracion.ReporteConfiguracionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/configuracion")
public class ConfiguracionController {

    @Autowired
    private ConfiguracionSistemaRepository configuracionRepository;

    @Autowired
    private ReporteConfiguracionRepository reporteConfiguracionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String TOKEN_NAME_KEY = "TOKEN_NAME";

    /** Clave lógica de la plantilla de la boleta. */
    private static final String CLAVE_REPORTE_BOLETA = "REPORTE_BOLETA";

    /** Tamaño máximo del JSON de configuración (coincide con el frontend: 2 MB). */
    private static final int MAX_JSON_REPORTE = 2 * 1024 * 1024;

    // Obtener el nombre del token
    @GetMapping("/token-name")
    public ResponseEntity<String> getTokenName() {
        Optional<ConfiguracionSistema> config = configuracionRepository.findById(TOKEN_NAME_KEY);
        // Devuelve el valor si existe, o "Quiros" como default si no está configurado
        return ResponseEntity.ok(config.map(ConfiguracionSistema::getValue).orElse("Quiros"));
    }

    // Actualizar el nombre del token (requiere rol de Admin, se añadirá seguridad después)
    @PostMapping("/token-name")
    public ResponseEntity<ConfiguracionSistema> setTokenName(@RequestBody String tokenName) {
        ConfiguracionSistema config = configuracionRepository.findById(TOKEN_NAME_KEY)
                .orElse(new ConfiguracionSistema(TOKEN_NAME_KEY, tokenName));
        config.setValue(tokenName);
        configuracionRepository.save(config);
        return ResponseEntity.ok(config);
    }
    
    // Endpoint genérico para obtener todas las configuraciones
    @GetMapping
    public List<ConfiguracionSistema> getAllConfiguraciones() {
        return configuracionRepository.findAll();
    }

    // ==============================================================
    // Configuración de la plantilla del reporte (boleta)
    // ==============================================================

    /**
     * Devuelve la plantilla del reporte en JSON.
     * Punto de lectura público: la página de padres (/descargar-boleta) no tiene sesión
     * y necesita la plantilla para generar el PDF.
     */
    @GetMapping(value = "/reporte-boleta", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> obtenerReporteBoleta() {
        String json = reporteConfiguracionRepository.findById(CLAVE_REPORTE_BOLETA)
                .map(ReporteConfiguracion::getValorJson)
                .orElse(null);

        if (json == null || json.isBlank()) {
            return ResponseEntity.ok(objectMapper.createObjectNode());
        }

        try {
            JsonNode nodo = objectMapper.readTree(json);
            return ResponseEntity.ok(nodo.isObject() ? nodo : objectMapper.createObjectNode());
        } catch (JsonProcessingException e) {
            // JSON corrupto: el frontend usará sus valores por defecto.
            return ResponseEntity.ok(objectMapper.createObjectNode());
        }
    }

    /**
     * Guarda la plantilla del reporte. Solo administradores.
     * El JSON se valida aquí para no guardar configuraciones corruptas.
     */
    @PutMapping(
            value = "/reporte-boleta",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> guardarReporteBoleta(@RequestBody JsonNode config) {
        if (config == null || !config.isObject() || config.size() == 0) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", "La configuración debe ser un objeto JSON."));
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", "La configuración no es JSON válido."));
        }

        if (json.length() > MAX_JSON_REPORTE) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", "La configuración supera el tamaño máximo de 2 MB."));
        }

        ReporteConfiguracion registro = reporteConfiguracionRepository.findById(CLAVE_REPORTE_BOLETA)
                .orElseGet(() -> ReporteConfiguracion.builder().clave(CLAVE_REPORTE_BOLETA).build());
        registro.setValorJson(json);
        reporteConfiguracionRepository.save(registro);

        return ResponseEntity.ok(config);
    }
}
