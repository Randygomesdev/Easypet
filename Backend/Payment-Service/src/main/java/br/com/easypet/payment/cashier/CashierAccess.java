package br.com.easypet.payment.cashier;

import br.com.easypet.payment.exception.ResourceNotFoundException;
import br.com.easypet.payment.security.VerifiedSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@Component
class CashierAccess {
    private static final Set<String> BILLABLE_STATUSES = Set.of("CONFIRMED", "IN_PROGRESS", "COMPLETED");
    private final RestTemplate http;
    private final String partnerUrl;
    private final String bookingUrl;

    CashierAccess(
            RestTemplateBuilder builder,
            @Value("${services.partner-service.url}") String partnerUrl,
            @Value("${services.booking-service.url}") String bookingUrl
    ) {
        this.http = builder.connectTimeout(Duration.ofSeconds(2)).readTimeout(Duration.ofSeconds(4)).build();
        this.partnerUrl = partnerUrl;
        this.bookingUrl = bookingUrl;
    }

    Scope resolve(Authentication authentication, String authorization) {
        VerifiedSession session = (VerifiedSession) authentication.getPrincipal();
        UUID partnerId = session.isTeamMember() ? session.partnerId()
                : get(partnerUrl + "/partners/me", authorization, Partner.class, "Estabelecimento").id();
        if (partnerId == null) {
            throw unavailable("Estabelecimento");
        }
        Partner active = get(partnerUrl + "/partners/catalog/" + partnerId, authorization,
                Partner.class, "Estabelecimento");
        if (!partnerId.equals(active.id())) {
            throw unavailable("Estabelecimento");
        }
        return new Scope(partnerId, session.userId());
    }

    void verifyBooking(UUID partnerId, UUID bookingId, String authorization) {
        Booking booking = get(bookingUrl + "/bookings/" + bookingId, authorization, Booking.class, "Reserva");
        if (!bookingId.equals(booking.id()) || !partnerId.equals(booking.partnerId())) {
            throw new ResourceNotFoundException("Reserva não encontrada.");
        }
        if (booking.status() == null || booking.paymentMethod() == null) {
            throw unavailable("Reserva");
        }
        if (!BILLABLE_STATUSES.contains(booking.status()) || "PACKAGE_CREDIT".equals(booking.paymentMethod())) {
            throw new CashierException(HttpStatus.CONFLICT, "A reserva não está disponível para cobrança no caixa.");
        }
    }

    private <T> T get(String url, String authorization, Class<T> response, String resource) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authorization);
        try {
            T body = http.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), response).getBody();
            if (body == null) {
                throw unavailable(resource);
            }
            return body;
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Forbidden ex) {
            throw new ResourceNotFoundException(resource + " fora do escopo ou inexistente.");
        } catch (HttpClientErrorException.Unauthorized ex) {
            throw new CashierException(HttpStatus.UNAUTHORIZED, "Sessão ausente ou inválida.");
        } catch (RestClientException ex) {
            throw unavailable(resource);
        }
    }

    private CashierException unavailable(String resource) {
        return new CashierException(HttpStatus.SERVICE_UNAVAILABLE,
                "Não foi possível verificar o acesso. Recurso: " + resource + ".");
    }

    record Scope(UUID partnerId, UUID actorId) {}

    private record Partner(UUID id) {}

    private record Booking(UUID id, UUID partnerId, String status, String paymentMethod) {}
}
