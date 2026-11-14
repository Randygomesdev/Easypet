package br.com.easypet.payment.cashier;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings.Redirects;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Component
class BookingExtraClient {
    private final RestTemplate http;
    private final ObjectMapper json;
    private final String authorizationUrl;
    private final String token;

    BookingExtraClient(
            RestTemplateBuilder builder, ObjectMapper json,
            @Value("${services.booking-service.url}") String bookingUrl,
            @Value("${app.booking-payment-authorization-token:}") String token
    ) {
        this.http = builder.redirects(Redirects.DONT_FOLLOW)
                .connectTimeout(Duration.ofSeconds(2)).readTimeout(Duration.ofSeconds(4)).build();
        this.json = json.copy().disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
        this.authorizationUrl = bookingUrl + "/internal/booking-extra-authorizations/{approval}"
                + "?partnerId={partner}&bookingId={booking}&version={version}";
        this.token = token;
    }

    Snapshot approved(UUID partnerId, UUID bookingId, CashierModels.ApplyExtra request) {
        if (token.isBlank()) {
            throw unavailable();
        }
        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        try {
            var response = http.exchange(authorizationUrl, HttpMethod.GET, new HttpEntity<>(headers), byte[].class,
                    request.approvalId(), partnerId, bookingId, request.approvalVersion());
            byte[] body = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || body == null) {
                throw unavailable();
            }
            Snapshot snapshot = json.readValue(body, Snapshot.class);
            if (snapshot == null || !snapshot.matches(partnerId, bookingId, request) || !snapshot.hasValidValue()) {
                throw unavailable();
            }
            return snapshot;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new CashierException(HttpStatus.NOT_FOUND, "Adicional aprovado não localizado para esta reserva.",
                    "CASHIER_EXTRA_APPROVAL_NOT_FOUND");
        } catch (HttpClientErrorException.Conflict ex) {
            throw new CashierException(HttpStatus.CONFLICT, "A versão do aceite diverge. Confira o adicional na reserva.");
        } catch (RestClientException | IOException ex) {
            throw unavailable();
        }
    }

    private static CashierException unavailable() {
        return new CashierException(HttpStatus.SERVICE_UNAVAILABLE, "Não foi possível validar o aceite do adicional.");
    }

    record Snapshot(
            UUID authorizationId, UUID partnerId, UUID bookingId, Integer version, String description,
            Integer quantity, Long unitPriceCents, Long amountCents, String currency, OffsetDateTime approvedAt,
            UUID approvedBy, UUID tutorId, String tutorIdentityType, String channel
    ) {
        boolean matches(UUID expectedPartner, UUID expectedBooking, CashierModels.ApplyExtra request) {
            return request.approvalId().equals(authorizationId) && expectedPartner.equals(partnerId)
                    && expectedBooking.equals(bookingId) && version != null && request.approvalVersion() == version;
        }

        boolean hasValidValue() {
            return "BRL".equals(currency) && description != null && !description.isBlank() && description.length() <= 300
                    && approvedAt != null && approvedBy != null && tutorId != null
                    && ("AUTH_USER".equals(tutorIdentityType) || "RECEPTION_CUSTOMER".equals(tutorIdentityType))
                    && ("DIGITAL".equals(channel) || "IN_PERSON".equals(channel))
                    && (!"DIGITAL".equals(channel) || !"AUTH_USER".equals(tutorIdentityType) || tutorId.equals(approvedBy))
                    && quantity != null && quantity >= 1 && quantity <= 100
                    && unitPriceCents != null && unitPriceCents >= 1 && unitPriceCents <= 100_000_000L
                    && amountCents != null && amountCents >= 1 && amountCents <= 100_000_000L
                    && amountCents == quantity * unitPriceCents;
        }
    }
}
