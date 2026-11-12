package dev.gabus.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager; // Ojo con la mayúscula en Config si así lo tienes
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.gabus.Config.JwtService;
import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public Usuario register(RegisterRequest request) {
        var existente = repository.findByUsername(request.getUsername());
        if (existente.isPresent()) {
            // El correo de un usuario desactivado queda bloqueado hasta restaurarlo.
            if (!existente.get().isActivo()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Existe un usuario desactivado con ese correo. Restáurelo o use otro correo.");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El correo ya está registrado.");
        }

        var user = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword())) // Encriptamos password
                .role(request.getRole() != null ? request.getRole() : Role.USER) 
                .build();
        
        return repository.save(user);
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );
        
        // Si llegamos aquí, el usuario y pass son correctos
        var user = repository.findByUsername(request.getUsername())
                .orElseThrow(); // Aquí deberías manejar la excepción si no existe
        
        var jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .build();
    }
    
}
