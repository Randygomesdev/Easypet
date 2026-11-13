package br.com.easypet.booking.security;

import br.com.easypet.booking.client.AuthSessionClient;
import br.com.easypet.booking.exception.BookingUnavailableException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
@RequiredArgsConstructor
public class BookingAuthenticationFilter extends OncePerRequestFilter {
    private final AuthSessionClient auth;

    @Value("${app.booking-outbox-token:}")
    private String outboxToken;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = path(request);
        return path.equals("/actuator/health") || path.equals("/swagger-ui.html")
                || path.startsWith("/swagger-ui/") || path.equals("/v3/api-docs") || path.startsWith("/v3/api-docs/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        String path = path(request);
        if (path.equals("/internal/booking-events") || path.startsWith("/internal/booking-events/")) {
            if (!outboxToken.isBlank() && authorization != null && MessageDigest.isEqual(
                    ("Bearer " + outboxToken).getBytes(StandardCharsets.UTF_8), authorization.getBytes(StandardCharsets.UTF_8))) {
                authenticate("notification-service", "BOOKING_OUTBOX");
            }
        } else if (authorization != null && authorization.startsWith("Bearer ") && !authorization.substring(7).isBlank()) {
            try {
                auth.verify(authorization).ifPresent(session -> authenticate(session, "ROLE_" + session.role()));
            } catch (BookingUnavailableException unavailable) {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.setContentType("application/json;charset=UTF-8");
                response.setHeader("Cache-Control", "no-store");
                response.getWriter().write("{\"status\":503,\"message\":\"Não foi possível verificar a sessão. Tente novamente.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private static void authenticate(Object principal, String authority) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority(authority))));
    }

    private static String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }
}
