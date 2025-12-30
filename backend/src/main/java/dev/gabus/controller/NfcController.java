package dev.gabus.controller;

import dev.gabus.dto.Estudiante.Estudiante;
import dev.gabus.dto.Estudiante.EstudianteRepository;
import dev.gabus.dto.Transaccion.TransaccionToken;
import dev.gabus.dto.Transaccion.TransaccionToken.TipoTransaccion;
import dev.gabus.dto.Transaccion.TransaccionTokenRepository;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/nfc")
public class NfcController {

    @Autowired
    private EstudianteRepository estudianteRepository;

    @Autowired
    private TransaccionTokenRepository transaccionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean canAccessStudent(Usuario user, Estudiante estudiante) {
        if (user.getRole() == Role.ADMIN) return true;
        if (estudiante.getGrado() == null || estudiante.getGrado().getProfesor() == null) return false;
        return estudiante.getGrado().getProfesor().getId().equals(user.getId());
    }

    // 1. Endpoint para buscar un estudiante por su ID de NFC
    @GetMapping("/estudiante/{nfcId}")
    public ResponseEntity<Estudiante> getEstudianteByNfcId(@PathVariable String nfcId) {
        Optional<Estudiante> estOpt = estudianteRepository.findByNfcId(nfcId);
        if (estOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        Estudiante estudiante = estOpt.get();
        Usuario user = getCurrentUser();

        if (!canAccessStudent(user, estudiante)) {
             return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(estudiante);
    }

    // 2. Endpoint para asignar un ID de NFC a un estudiante
    @PostMapping("/asignar")
    public ResponseEntity<?> asignarNfcIdAEstudiante(@RequestBody Map<String, String> payload) {
        Long estudianteId = Long.parseLong(payload.get("estudianteId"));
        String nfcId = payload.get("nfcId");

        Usuario user = getCurrentUser();

        // Validar que el NFC ID no esté ya asignado
        if (estudianteRepository.findByNfcId(nfcId).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("El Tag NFC ya está asignado a otro estudiante.");
        }

        return estudianteRepository.findById(estudianteId)
                .map(estudiante -> {
                    if (!canAccessStudent(user, estudiante)) {
                         return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

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

        Usuario user = getCurrentUser();

        return estudianteRepository.findByNfcId(nfcId)
                .map(estudiante -> {
                    if (!canAccessStudent(user, estudiante)) {
                         return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

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
