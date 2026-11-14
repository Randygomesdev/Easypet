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
class BookingAccessClient {
    private final RestClient booking;

    BookingAccessClient(InternalHttp http, @Value("${notification.booking-url}") String url) {
        booking = http.client(url).build();
    }

    void requireRead(UUID id, String token) {
        try {
            var response = booking.get().uri("/bookings/{id}", id).header(HttpHeaders.AUTHORIZATION, token)
                    .retrieve().toEntity(BookingReference.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null
                    || !id.equals(response.getBody().id())) {
                throw unavailable();
            }
        } catch (HttpClientErrorException.Unauthorized exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida.");
        } catch (HttpClientErrorException.Forbidden | HttpClientErrorException.NotFound exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva indisponível para esta sessão.");
        } catch (RestClientException exception) {
            throw unavailable();
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Não foi possível verificar a reserva.");
    }

    record BookingReference(UUID id) {}
}
