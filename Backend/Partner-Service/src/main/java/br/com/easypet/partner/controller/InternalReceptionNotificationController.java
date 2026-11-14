package br.com.easypet.partner.controller;

import br.com.easypet.partner.service.ReceptionNotificationService;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Hidden
@RestController
public class InternalReceptionNotificationController {
    public static final String ROUTE =
            "/internal/partners/{partnerId}/reception-customers/{customerId}/notification-recipient";

    private final ReceptionNotificationService notifications;
    private final byte[] expectedAuthorization;

    public InternalReceptionNotificationController(ReceptionNotificationService notifications,
            @Value("${RECEPTION_NOTIFICATION_TOKEN:}") String secret) {
        this.notifications = notifications;
        this.expectedAuthorization = secret.isBlank() ? null : ("Bearer " + secret).getBytes(StandardCharsets.UTF_8);
    }

    @GetMapping(ROUTE)
    public ResponseEntity<ReceptionNotificationService.Recipient> recipient(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable UUID partnerId, @PathVariable UUID customerId) {
        if (expectedAuthorization == null) throw unavailable();
        if (authorization == null
                || !MessageDigest.isEqual(expectedAuthorization, authorization.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial de serviço inválida.");
        }
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(notifications.recipient(partnerId, customerId));
        } catch (DataAccessException | TransactionException failure) {
            throw unavailable();
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Consulta de destinatário indisponível.");
    }
}
