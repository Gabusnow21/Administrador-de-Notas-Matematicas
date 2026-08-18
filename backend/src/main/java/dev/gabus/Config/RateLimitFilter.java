package dev.gabus.Config;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, RateBucket> validateBuckets = new ConcurrentHashMap<>();
    private final Map<String, RateBucket> downloadBuckets = new ConcurrentHashMap<>();

    private static final int VALIDATE_MAX_REQUESTS = 5;
    private static final int DOWNLOAD_MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String ip = getClientIp(request);
        String path = request.getRequestURI();

        if (path.equals("/api/tickets/validate") && "POST".equalsIgnoreCase(request.getMethod())) {
            if (!tryConsume(ip, validateBuckets, VALIDATE_MAX_REQUESTS)) {
                sendTooManyRequests(response, "Demasiadas solicitudes. Intenta de nuevo en un minuto.");
                return;
            }
        }

        if (path.startsWith("/api/download/") && "GET".equalsIgnoreCase(request.getMethod())) {
            if (!tryConsume(ip, downloadBuckets, DOWNLOAD_MAX_REQUESTS)) {
                sendTooManyRequests(response, "Demasiadas descargas. Intenta de nuevo en un minuto.");
                return;
            }
        }

        cleanExpiredBuckets(validateBuckets);
        cleanExpiredBuckets(downloadBuckets);

        filterChain.doFilter(request, response);
    }

    private boolean tryConsume(String ip, Map<String, RateBucket> buckets, int maxRequests) {
        long now = System.currentTimeMillis();
        RateBucket bucket = buckets.compute(ip, (key, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RateBucket(now, 1);
            }
            existing.count++;
            return existing;
        });
        return bucket.count <= maxRequests;
    }

    private void cleanExpiredBuckets(Map<String, RateBucket> buckets) {
        long now = System.currentTimeMillis();
        buckets.entrySet().removeIf(entry -> now - entry.getValue().windowStart > WINDOW_MS * 2);
    }

    private void sendTooManyRequests(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class RateBucket {
        long windowStart;
        int count;

        RateBucket(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
