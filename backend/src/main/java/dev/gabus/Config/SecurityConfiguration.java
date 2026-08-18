package dev.gabus.Config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.RequiredArgsConstructor;
import dev.gabus.Config.RateLimitFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfiguration {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    // Inyectamos la URL desde application.properties
    // Si no existe la variable, por defecto usa localhost:4200
    @Value("${application.cors.allowed-origin:http://localhost:4200}")
    private String allowedOrigin;

    private final RateLimitFilter rateLimitFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        // 1. Desactivar CSRF (Causa #1 del error 403 en Post)
        .csrf(AbstractHttpConfigurer::disable)
        
        // 2. Configurar CORS (usando el Bean que definimos abajo)
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        
        // 3. Configurar Permisos de Rutas
        .authorizeHttpRequests(auth -> auth
            // Permitir OPTIONS explícitamente (Preflight checks del navegador)
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            
            // Rutas de autenticación
            .requestMatchers("/api/auth/**").permitAll()
            
            // Rutas públicas de boletas (padres sin autenticación)
            .requestMatchers("/api/tickets/validate").permitAll()
            .requestMatchers("/api/tickets/check-nie/**").permitAll()
            .requestMatchers("/api/download/**").permitAll()
            
            // Rutas de admin (requieren rol ADMIN)
            .requestMatchers("/api/tickets/generate").hasAuthority("ADMIN")
            .requestMatchers("/api/tickets/config/**").hasAuthority("ADMIN")
            .requestMatchers("/api/tickets/upload").hasAuthority("ADMIN")
            
            // Rutas de actividades
            .requestMatchers("/api/actividades/**").permitAll()
            
            // Otras rutas estáticas
            .requestMatchers("/").permitAll()
            .requestMatchers("/error").permitAll()
            
            // Todo lo demás requiere autenticación
            .anyRequest().authenticated()
        )
        
        // 4. Gestión de sesión Stateless (No guardar cookies)
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        )
        
        .authenticationProvider(authenticationProvider)
        .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class)
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    
    // USAR allowedOriginPatterns EN LUGAR DE allowedOrigins
    // Esto permite que funcione "*" incluso si hay credenciales involucradas
    configuration.setAllowedOriginPatterns(List.of("*"));
    
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
    configuration.setAllowCredentials(true); // Permitir credenciales/cookies

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
    }
}