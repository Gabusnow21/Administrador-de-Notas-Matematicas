package dev.gabus.controller;

import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Transaccion.TransaccionToken;
import dev.gabus.dto.Transaccion.TransaccionToken.TipoTransaccion;
import dev.gabus.dto.Transaccion.TransaccionTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/nfc")
public class NfcController {

    @Autowired
    private EstudianteRepository estudianteRepository;

    @Autowired
    private TransaccionTokenRepository transaccionRepository;

    // 1. Endpoint para buscar un estudiante por su ID de NFC
    @GetMapping("/estudiante/{nfcId}")
    public ResponseEntity<Estudiante> getEstudianteByNfcId(@PathVariable String nfcId) {
        return estudianteRepository.findByNfcId(nfcId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 2. Endpoint para asignar un ID de NFC a un estudiante
    @PostMapping("/asignar")
    public ResponseEntity<?> asignarNfcIdAEstudiante(@RequestBody Map<String, String> payload) {
        Long estudianteId = Long.parseLong(payload.get("estudianteId"));
        String nfcId = payload.get("nfcId");

        // Validar que el NFC ID no esté ya asignado
        if (estudianteRepository.findByNfcId(nfcId).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("El Tag NFC ya está asignado a otro estudiante.");
        }

        return estudianteRepository.findById(estudianteId)
                .map(estudiante -> {
                    estudiante.setNfcId(nfcId);
                    estudianteRepository.save(estudiante);
                    return ResponseEntity.ok(estudiante);
                }).orElse(ResponseEntity.notFound().build());
    }

    // 3. Endpoint para realizar una transacción (acumular o canjear tokens)
    @PostMapping("/transaccion")
    public ResponseEntity<?> realizarTransaccion(@RequestBody Map<String, String> payload) {
        String nfcId = payload.get("nfcId");
        int monto = Integer.parseInt(payload.get("monto"));
        String descripcion = payload.get("descripcion");
        TipoTransaccion tipo = TipoTransaccion.valueOf(payload.get("tipo")); // ACUMULACION o CANJE

        return estudianteRepository.findByNfcId(nfcId)
                .map(estudiante -> {
                    if (tipo == TipoTransaccion.CANJE && estudiante.getSaldoTokens() < monto) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Saldo de tokens insuficiente.");
                    }

                    // Actualizar saldo del estudiante
                    int nuevoSaldo = estudiante.getSaldoTokens() + (tipo == TipoTransaccion.ACUMULACION ? monto : -monto);
                    estudiante.setSaldoTokens(nuevoSaldo);
                    estudianteRepository.save(estudiante);

                    // Registrar la transacción
                    TransaccionToken transaccion = TransaccionToken.builder()
                            .estudiante(estudiante)
                            .tipo(tipo)
                            .monto(monto)
                            .descripcion(descripcion)
                            .build();
                    transaccionRepository.save(transaccion);

                    return ResponseEntity.ok(estudiante);
                }).orElse(ResponseEntity.notFound().build());
    }
}
