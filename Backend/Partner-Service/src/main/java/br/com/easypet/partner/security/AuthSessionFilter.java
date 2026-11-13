package br.com.easypet.partner.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
@RequiredArgsConstructor
public class AuthSessionFilter extends OncePerRequestFilter {
    private final AuthSessionClient auth;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/internal/partners/customer-claims/") && path.endsWith("/owner")) {
            return true;
        }
        return path.equals("/actuator/health") || path.equals("/swagger-ui.html")
                || path.startsWith("/swagger-ui/") || path.equals("/v3/api-docs")
                || path.equals("/v3/api-docs.yaml") || path.startsWith("/v3/api-docs/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String bearer = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (bearer == null || !bearer.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        AuthSessionClient.Session session;
        try {
            session = auth.read(bearer);
        } catch (RestClientException | IllegalStateException failure) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"status\":503,\"message\":\"Serviço de autenticação indisponível.\"}");
            return;
        }
        if (session != null) {
            var authorities = new ArrayList<SimpleGrantedAuthority>();
            authorities.add(new SimpleGrantedAuthority("ROLE_" + session.role()));
            if ("TEAM_MEMBER".equals(session.role())) {
                session.permissions().stream().map(SimpleGrantedAuthority::new).forEach(authorities::add);
            }
            var principal = new UserPrincipal(session.userId().toString(), null,
                    session.name() == null || session.name().isBlank() ? "Usuário EasyPet" : session.name(),
                    session.partnerId(), session.teamAccessId());
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    principal, session.userId().toString(), authorities));
        }
        chain.doFilter(request, response);
    }
}
