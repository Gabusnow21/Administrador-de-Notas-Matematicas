package dev.gabus;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import dev.gabus.dto.Usuario.Role;
import dev.gabus.dto.Usuario.Usuario;
import dev.gabus.dto.Usuario.UsuarioRepository;

@SpringBootApplication
public class GabusApplication {

	public static void main(String[] args) {
		SpringApplication.run(GabusApplication.class, args);
	}

	public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Esto evita el error "No serializer found for class ... ByteBuddyInterceptor"
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        return mapper;
    }

	@Bean
	public CommandLineRunner initAdmin(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			String emailAdmin = "admin@ejemplo.com";
			if (usuarioRepository.findByUsername(emailAdmin).isEmpty()) {
				Usuario admin = Usuario.builder()
						.nombre("Admin")
						.apellido("Sistema")
						.username(emailAdmin)
						.password(passwordEncoder.encode("1234"))
						.role(Role.ADMIN)
						.build();
				usuarioRepository.save(admin);
				System.out.println("Usuario ADMIN creado por defecto: " + emailAdmin);
			}
		};
	}

}
