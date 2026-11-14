package br.com.easypet.notification;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Component
class AuthClient {
    private final RestClient auth;
    private final String recipientToken;

    AuthClient(InternalHttp http, @Value("${notification.auth-url}") String authUrl,
            @Value("${notification.recipient-token}") String recipientToken) {
        this.auth = http.client(authUrl).build();
        this.recipientToken = recipientToken;
    }

    record Session(UUID userId, String role) {}
    record Recipient(String email) {}

    UUID requireAdmin(String authorization) {
        return requireRole(authorization, "ADMIN");
    }

    UUID requireRole(String authorization, String role) {
        Session session = requireSession(authorization);
        if (!role.equals(session.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sua sessão não tem acesso a esta operação.");
        }
        return session.userId();
    }

    Session requireSession(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)
                || authorization.substring(7).isBlank()) {
            throw invalidSession();
        }

        Session session;
        try {
            var response = auth.get().uri("/auth/session").header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve().toEntity(Session.class);
            if (response.getStatusCode() != HttpStatus.OK) {
                throw unavailable();
            }
            session = response.getBody();
        } catch (HttpClientErrorException.Unauthorized exception) {
            throw invalidSession();
        } catch (RestClientException exception) {
            throw unavailable();
        }

        if (session == null || session.userId() == null || session.role() == null) {
            throw unavailable();
        }
        return session;
    }

    String recipientEmail(UUID userId) {
        if (userId == null) {
            return null;
        }
        try {
            var response = auth.get().uri("/internal/notification-recipients/{userId}", userId)
                    .headers(headers -> headers.setBearerAuth(recipientToken)).retrieve().toEntity(Recipient.class);
            Recipient recipient = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || recipient == null
                    || recipient.email() == null || recipient.email().isBlank()) {
                throw new RestClientException("Resposta inválida do serviço de destinatários");
            }
            return recipient.email();
        } catch (HttpClientErrorException.NotFound exception) {
            return null;
        }
    }

    private static ResponseStatusException invalidSession() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida.");
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "A validação de sessão está indisponível.");
    }
}
