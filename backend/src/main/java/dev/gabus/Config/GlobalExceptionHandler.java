package dev.gabus.Config;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Devuelve un cuerpo JSON con el motivo real de las reglas de negocio
 * (por ejemplo, el bloqueo al desactivar un profesor con grados asignados).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        String mensaje = ex.getReason() != null ? ex.getReason() : "No se pudo completar la operación";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", mensaje));
    }
}
