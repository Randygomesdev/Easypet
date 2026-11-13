package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.config.HomologAuthConfiguration;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.repository.UserRepository;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@RestController
@Hidden
@RequestMapping("/internal")
public class InternalIdentityController {

    private final UserRepository users;
    private final HomologAuthConfiguration configuration;
    private final String notificationToken;
    private final String receptionClaimToken;

    public InternalIdentityController(
            UserRepository users,
            HomologAuthConfiguration configuration,
            @Value("${app.notification-recipient-token}") String notificationToken,
            @Value("${app.reception-claim-token}") String receptionClaimToken) {
        this.users = users;
        this.configuration = configuration;
        this.notificationToken = notificationToken;
        this.receptionClaimToken = receptionClaimToken;
    }

    @GetMapping("/notification-recipients/{userId}")
    public ResponseEntity<Recipient> recipient(
            @PathVariable UUID userId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        requireServiceToken(authorization, notificationToken);
        return users.findActiveEmailByIdAndRole(userId, UserRole.CUSTOMER)
                .filter(configuration::canSendTo)
                .filter(InternalIdentityController::isMailAddress)
                .map(email -> ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Recipient(email)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build());
    }

    @GetMapping("/reception-claim-customers/{userId}")
    public ResponseEntity<Void> claimCustomer(
            @PathVariable UUID userId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        requireServiceToken(authorization, receptionClaimToken);
        HttpStatus status = users.existsByIdAndRoleAndActiveTrue(userId, UserRole.CUSTOMER)
                ? HttpStatus.NO_CONTENT : HttpStatus.NOT_FOUND;
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).build();
    }

    private static void requireServiceToken(String authorization, String secret) {
        if (secret.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_AUTH_UNAVAILABLE",
                    "Autenticação de serviço indisponível.");
        }
        if (authorization == null || !MessageDigest.isEqual(("Bearer " + secret).getBytes(StandardCharsets.UTF_8),
                authorization.getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SERVICE_TOKEN_INVALID", "Credencial de serviço inválida.");
        }
    }

    private static boolean isMailAddress(String value) {
        try {
            var address = new InternetAddress(value, true);
            address.validate();
            return value.equals(address.getAddress()) && !address.isGroup() && address.getPersonal() == null;
        } catch (AddressException ignored) {
            return false;
        }
    }

    public record Recipient(String email) {}
}
