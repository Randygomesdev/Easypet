package br.com.easypet.partner.controller;

import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.repository.ReceptionCustomerRepository;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Hidden
@RestController
@RequestMapping("/internal/partners/customer-claims")
public class InternalClaimOwnerController {
    private final ReceptionCustomerRepository customers;
    private final byte[] expectedAuthorization;

    public InternalClaimOwnerController(ReceptionCustomerRepository customers,
            @Value("${BOOKING_PET_SUMMARY_TOKEN:}") String secret) {
        this.customers = customers;
        this.expectedAuthorization = secret.isBlank() ? null : ("Bearer " + secret).getBytes(StandardCharsets.UTF_8);
    }

    @GetMapping("/{customerId}/owner")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmOwner(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable UUID customerId, @RequestParam UUID partnerId, @RequestParam UUID userId) {
        if (expectedAuthorization == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Consulta de vínculo indisponível.");
        }
        if (authorization == null
                || !MessageDigest.isEqual(expectedAuthorization, authorization.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial de serviço inválida.");
        }
        if (!customers.existsByIdAndPartnerIdAndClaimedUserId(customerId, partnerId, userId)) {
            throw new ResourceNotFoundException("Vínculo de tutor indisponível.");
        }
    }
}
