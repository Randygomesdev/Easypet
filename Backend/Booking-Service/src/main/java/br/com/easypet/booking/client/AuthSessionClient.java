package br.com.easypet.booking.client;

import br.com.easypet.booking.exception.BookingUnavailableException;
import br.com.easypet.booking.security.BookingSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class AuthSessionClient {
    private static final Set<String> ROLES = Set.of("CUSTOMER", "USER", "PARTNER", "ADMIN", "TEAM_MEMBER");
    private static final Set<String> TEAM_ROLES = Set.of("MANAGER", "RECEPTION", "PROFESSIONAL");

    private final RestTemplate http;

    @Value("${services.auth-service.url}")
    private String authUrl;

    public Optional<BookingSession> verify(String authorization) {
        try {
            var headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, authorization);
            var response = http.exchange(authUrl + "/auth/session", HttpMethod.GET,
                    new HttpEntity<>(headers), BookingSession.class);
            var session = response.getBody();
            if (response.getStatusCode() != HttpStatus.OK || session == null || session.userId() == null || session.role() == null
                    || !ROLES.contains(session.role()) || session.permissions() == null
                    || session.permissions().stream().anyMatch(permission -> permission == null || permission.isBlank())
                    || !validScope(session)) {
                throw new BookingUnavailableException("Não foi possível verificar a sessão. Tente novamente.");
            }
            return Optional.of(session);
        } catch (HttpClientErrorException.Unauthorized ex) {
            return Optional.empty();
        } catch (RestClientException ex) {
            throw new BookingUnavailableException("Não foi possível verificar a sessão. Tente novamente.", ex);
        }
    }

    private boolean validScope(BookingSession session) {
        if ("TEAM_MEMBER".equals(session.role())) {
            return session.partnerId() != null && session.teamAccessId() != null
                    && session.accessRole() != null && TEAM_ROLES.contains(session.accessRole());
        }
        return session.partnerId() == null && session.accessRole() == null
                && session.teamAccessId() == null && session.permissions().isEmpty();
    }
}
