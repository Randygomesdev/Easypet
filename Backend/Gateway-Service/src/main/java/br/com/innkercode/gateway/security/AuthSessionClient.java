package br.com.innkercode.gateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Component
final class AuthSessionClient {
    private final WebClient client;
    private final Duration timeout;

    AuthSessionClient(WebClient.Builder builder,
                      @Value("${gateway.session.auth-url}") String authUrl,
                      @Value("${gateway.session.timeout}") Duration timeout) {
        this.client = builder.baseUrl(authUrl).build();
        this.timeout = timeout;
    }

    Mono<HttpStatus> verify(String authorization) {
        return client.get().uri("/api/v1/auth/session")
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .exchangeToMono(response -> {
                    if (response.statusCode().value() == 200) {
                        return response.bodyToMono(Session.class)
                                .map(session -> session.isValid() ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
                                .defaultIfEmpty(HttpStatus.SERVICE_UNAVAILABLE);
                    }
                    return Mono.just(response.statusCode().value() == 401
                            ? HttpStatus.UNAUTHORIZED : HttpStatus.SERVICE_UNAVAILABLE);
                })
                .timeout(timeout)
                .onErrorReturn(HttpStatus.SERVICE_UNAVAILABLE);
    }

    private record Session(UUID userId, String role, UUID partnerId, String accessRole, List<String> permissions,
                           UUID teamAccessId) {
        boolean isValid() {
            return userId != null && role != null && !role.isBlank() && permissions != null
                    && (!role.equals("TEAM_MEMBER")
                        || (partnerId != null && accessRole != null && !accessRole.isBlank() && teamAccessId != null));
        }
    }
}
