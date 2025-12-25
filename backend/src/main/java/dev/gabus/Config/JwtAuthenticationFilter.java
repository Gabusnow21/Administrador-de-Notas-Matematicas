package dev.gabus.Config;

import java.io.IOException;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService; // Lo definiremos en el siguiente paso

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
) throws ServletException, IOException {

    final String authHeader = request.getHeader("Authorization");
    final String jwt;
    final String userEmail;

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        System.out.println("❌ Filtro: No hay header Authorization o no empieza con Bearer");
        filterChain.doFilter(request, response);
        return;
    }

    jwt = authHeader.substring(7);
    // DEBUG: Imprimir token recibido
    System.out.println("🔍 Token recibido: " + jwt.substring(0, 10) + "..."); 

    try {
        userEmail = jwtService.extractUsername(jwt);
        System.out.println("👤 Usuario extraído del token: " + userEmail);

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
            
            if (jwtService.isTokenValid(jwt, userDetails)) {
                System.out.println("✅ Token VÁLIDO. Autenticando usuario...");
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else {
                System.out.println("❌ Token INVÁLIDO según jwtService");
            }
        }
    } catch (Exception e) {
        System.out.println("💥 Excepción verificando token: " + e.getMessage());
        e.printStackTrace(); // Esto nos dirá el error exacto en la terminal
        SecurityContextHolder.clearContext(); // Limpiar contexto por seguridad
    }

    filterChain.doFilter(request, response);
}
}