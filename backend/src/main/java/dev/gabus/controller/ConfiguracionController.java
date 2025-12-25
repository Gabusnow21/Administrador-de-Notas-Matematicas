package dev.gabus.controller;

import dev.gabus.dto.Configuracion.ConfiguracionSistema;
import dev.gabus.dto.Configuracion.ConfiguracionSistemaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/configuracion")
public class ConfiguracionController {

    @Autowired
    private ConfiguracionSistemaRepository configuracionRepository;

    private static final String TOKEN_NAME_KEY = "TOKEN_NAME";

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
}
