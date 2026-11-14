package br.com.easypet.notification;

import java.time.Instant;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
class ReceptionRecipientClient {
    private final RestClient partner;
    private final String token;

    ReceptionRecipientClient(InternalHttp http, @Value("${notification.partner-url}") String url,
            @Value("${notification.reception-token}") String token) {
        partner = http.client(url).build();
        this.token = token;
    }

    boolean enabled() {
        return !token.isBlank();
    }

    record Recipient(String email, UUID authorizationId, Instant grantedAt) {}

    Recipient resolve(UUID partnerId, UUID customerId) {
        if (!enabled()) return null;
        try {
            var response = partner.get()
                    .uri("/internal/partners/{partnerId}/reception-customers/{customerId}/notification-recipient",
                            partnerId, customerId)
                    .headers(headers -> headers.setBearerAuth(token)).retrieve().toEntity(Recipient.class);
            var recipient = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || recipient == null || recipient.authorizationId() == null
                    || recipient.grantedAt() == null || recipient.email() == null || recipient.email().isBlank()) {
                throw new RestClientException("Resposta inválida da autorização de balcão");
            }
            return recipient;
        } catch (HttpClientErrorException.NotFound exception) {
            return null;
        }
    }
}
