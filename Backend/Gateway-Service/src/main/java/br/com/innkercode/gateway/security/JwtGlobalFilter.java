package br.com.innkercode.gateway.security;

import br.com.innkercode.gateway.config.RateLimiterConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Slf4j
@Component
public class JwtGlobalFilter implements GlobalFilter, Ordered {

    private final AuthSessionClient sessions;
    private final boolean verifySession;
    private final boolean googleEnabled;

    public JwtGlobalFilter(AuthSessionClient sessions,
                           @Value("${gateway.session.enabled}") boolean verifySession,
                           @Value("${GOOGLE_AUTH_ENABLED:false}") String googleEnabled) {
        this.sessions = sessions;
        this.verifySession = verifySession;
        this.googleEnabled = "true".equals(googleEnabled);
    }

    @Value("${jwt.secret}")
    private String jwtSecret;

    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/register/partner",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
            "/api/v1/auth/reset-password/validate",
            "/api/v1/auth/team/invitations/accept"
    );
    private static final Set<String> GOOGLE_BROWSER_PATHS = Set.of(
            "/api/v1/oauth2/authorization/google",
            "/api/v1/login/oauth2/code/google"
    );
    private static final String GOOGLE_EXCHANGE = "/api/v1/auth/oauth2/exchange";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        ServerWebExchange sanitized = exchange.mutate().request(request.mutate().headers(headers -> {
            headers.remove("X-User-Id");
            headers.remove("X-User-Role");
            headers.remove("X-User-Email");
            headers.remove(RateLimiterConfig.CLIENT_IP);
            headers.remove(RateLimiterConfig.INGRESS_TOKEN);
        }).build()).build();
        if (GOOGLE_BROWSER_PATHS.contains(path) || GOOGLE_EXCHANGE.equals(path)) {
            HttpMethod allowed = GOOGLE_EXCHANGE.equals(path) ? HttpMethod.POST : HttpMethod.GET;
            if (googleEnabled && request.getMethod() == allowed) {
                return chain.filter(sanitized);
            }
            return respond(exchange, HttpStatus.NOT_FOUND, "Rota indisponível.");
        }
        if (request.getMethod() == HttpMethod.POST && PUBLIC_AUTH_PATHS.contains(path)) {
            return chain.filter(sanitized);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ") || authHeader.substring(7).isBlank()) {
            return unauthorizedResponse(exchange);
        }

        if (verifySession) {
            if (request.getMethod() == HttpMethod.GET && path.equals("/api/v1/auth/session")) {
                return chain.filter(sanitized);
            }
            return sessions.verify(authHeader).flatMap(status -> switch (status) {
                case OK -> chain.filter(sanitized);
                case UNAUTHORIZED -> unauthorizedResponse(exchange);
                default -> respond(exchange, HttpStatus.SERVICE_UNAVAILABLE,
                        "A validação da sessão está temporariamente indisponível.");
            });
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = extractClaims(token);
            String userId = claims.get("userId", String.class);
            String role   = claims.get("role", String.class);
            String email  = claims.getSubject();

            ServerHttpRequest mutatedRequest = sanitized.getRequest().mutate()
                    .header("X-User-Id",    userId != null ? userId : "")
                    .header("X-User-Role",  role   != null ? role   : "")
                    .header("X-User-Email", email  != null ? email  : "")
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (Exception e) {
            log.debug("Gateway: token JWT inválido ou expirado");
            return unauthorizedResponse(exchange);
        }
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange) {
        return respond(exchange, HttpStatus.UNAUTHORIZED, "Token de autenticação ausente ou inválido.");
    }

    private Mono<Void> respond(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setCacheControl("no-store");
        response.getHeaders().add("Content-Type", "application/json");
        var body = response.bufferFactory()
                .wrap(("{\"status\":" + status.value() + ",\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(body));
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public int getOrder() {
        return 100;
    }
}
