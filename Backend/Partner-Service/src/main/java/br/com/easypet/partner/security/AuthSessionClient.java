package br.com.easypet.partner.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class AuthSessionClient {
    private static final Set<String> ROLES = Set.of("ADMIN", "CUSTOMER", "PARTNER", "USER", "TEAM_MEMBER", "MASTER");
    private static final Set<String> TEAM_ROLES = Set.of("MANAGER", "RECEPTION", "PROFESSIONAL");
    private final RestClient auth;
    private final String claimToken;

    public AuthSessionClient(@Value("${AUTH_SERVICE_URL:http://localhost:8081/api/v1}") String url,
            @Value("${RECEPTION_CLAIM_TOKEN:}") String claimToken) {
        this.claimToken = claimToken;
        var transport = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(transport);
        factory.setReadTimeout(Duration.ofSeconds(3));
        auth = RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }

    public Session read(String bearer) {
        try {
            var response = auth.get().uri("/auth/session").header(HttpHeaders.AUTHORIZATION, bearer)
                    .retrieve().toEntity(Session.class);
            Session session = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || session == null || !session.valid()) {
                throw new IllegalStateException("Resposta de sessão incompleta");
            }
            return session;
        } catch (HttpClientErrorException.Unauthorized rejected) {
            return null;
        }
    }

    public List<TeamAccess> teamAccesses(String bearer) {
        var response = auth.get().uri("/auth/team/accesses").header(HttpHeaders.AUTHORIZATION, bearer)
                .retrieve().toEntity(TeamAccess[].class);
        TeamAccess[] result = response.getBody();
        if (response.getStatusCode() != HttpStatus.OK || result == null
                || java.util.Arrays.stream(result).anyMatch(java.util.Objects::isNull)) {
            throw new IllegalStateException("Resposta de equipe incompleta");
        }
        return List.of(result);
    }

    public boolean isClaimTarget(UUID userId) {
        if (claimToken.isBlank()) throw new IllegalStateException("Verificação de tutor indisponível");
        try {
            var response = auth.get().uri("/internal/reception-claim-customers/{userId}", userId)
                    .headers(headers -> headers.setBearerAuth(claimToken)).retrieve().toBodilessEntity();
            if (response.getStatusCode() != HttpStatus.NO_CONTENT) {
                throw new IllegalStateException("Resposta de verificação de tutor inválida");
            }
            return true;
        } catch (HttpClientErrorException.NotFound rejected) {
            return false;
        }
    }

    public record TeamAccess(UUID id, UUID userId, UUID partnerId, String accessRole, String status) {}

    public record Session(UUID userId, String role, UUID partnerId, String accessRole,
                          List<String> permissions, String name, UUID teamAccessId) {
        private boolean valid() {
            if (userId == null || role == null || !ROLES.contains(role) || permissions == null
                    || permissions.stream().anyMatch(permission -> permission == null || permission.isBlank()
                            || permission.startsWith("ROLE_"))) return false;
            if ("TEAM_MEMBER".equals(role)) {
                return partnerId != null && accessRole != null && TEAM_ROLES.contains(accessRole) && teamAccessId != null;
            }
            return partnerId == null && accessRole == null && teamAccessId == null && permissions.isEmpty();
        }
    }
}
