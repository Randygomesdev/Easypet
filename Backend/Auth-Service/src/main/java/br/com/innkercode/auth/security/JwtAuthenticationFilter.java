package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.response.SessionResponse;
import br.com.innkercode.auth.repository.TeamAccessRepository;
import br.com.innkercode.auth.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository users;
    private final TeamAccessRepository accesses;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                authenticate(authorization.substring(7), request);
            } catch (DataAccessException | TransactionException ex) {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"status\":503,\"code\":\"SESSION_UNAVAILABLE\",\"message\":\"Sessão temporariamente indisponível.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Rotas internas usam credenciais próprias, verificadas nos controladores.
        return request.getServletPath().startsWith("/internal/")
                || (request.getServletPath().isEmpty()
                    && request.getRequestURI().startsWith(request.getContextPath() + "/internal/"));
    }

    private void authenticate(String token, HttpServletRequest request) {
        try {
            var claims = jwtService.verify(token);
            String userId = claims.get("userId", String.class);
            if (userId == null) {
                return;
            }
            UUID id = UUID.fromString(userId);
            Integer versionClaim = claims.get("sessionVersion", Integer.class);
            int version = versionClaim == null ? 0 : versionClaim;
            users.findById(id)
                    .filter(user -> user.isEnabled() && user.getSessionVersion() == version)
                    .filter(user -> user.getEmail().equals(claims.getSubject()))
                    .filter(user -> user.getRole().name().equals(claims.get("role", String.class)))
                    .ifPresent(user -> {
                        SessionResponse session;
                        if (user.getRole() == UserRole.TEAM_MEMBER) {
                            var current = accesses.findCurrentAccess(id, version);
                            if (current.isEmpty()) return;
                            session = SessionResponse.from(user, current.get());
                        } else {
                            session = SessionResponse.from(user);
                        }
                        request.setAttribute(SessionResponse.REQUEST_ATTRIBUTE, session);
                        SecurityContextHolder.getContext().setAuthentication(
                                UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
                    });
        } catch (JwtException | IllegalArgumentException ignored) {
            // Invalid bearer credentials leave the request unauthenticated.
        }
    }
}
