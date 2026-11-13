package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.ReceptionCustomer;
import br.com.easypet.partner.domain.entity.ReceptionCustomerClaim;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.repository.ReceptionCustomerClaimRepository;
import br.com.easypet.partner.repository.ReceptionCustomerRepository;
import br.com.easypet.partner.security.UserPrincipal;
import br.com.easypet.partner.security.AuthSessionClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerClaimService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration PROOF_TTL = Duration.ofMinutes(15);
    private final DeskAccess desks;
    private final ReceptionCustomerRepository customers;
    private final ReceptionCustomerClaimRepository claims;
    private final AuthSessionClient auth;

    @Transactional
    public IssuedProof issue(UserPrincipal actor, UUID customerId, UUID targetUserId) {
        UUID partnerId = desks.activePartner(actor).getId();
        if (!customers.existsByIdAndPartnerId(customerId, partnerId)) throw missing();
        try {
            if (!auth.isClaimTarget(targetUserId)) {
                throw new ResourceNotFoundException("Código de conta inválido ou conta de tutor indisponível.");
            }
        } catch (RestClientException | IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Não foi possível verificar a conta do tutor.");
        }
        ReceptionCustomer customer = customers.lockById(customerId)
                .filter(found -> partnerId.equals(found.getPartner().getId())).orElseThrow(CustomerClaimService::missing);
        if (customer.getClaimedUserId() != null) throw unavailable();

        byte[] entropy = new byte[32];
        RANDOM.nextBytes(entropy);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
        Instant now = Instant.now();
        Instant expiry = now.plus(PROOF_TTL);
        claims.revokeOpen(customerId, now);
        claims.save(ReceptionCustomerClaim.builder().customerId(customerId).partnerId(partnerId)
                .issuedBy(UUID.fromString(actor.id())).targetUserId(targetUserId).digest(digest(token))
                .issuedAt(now).expiresAt(expiry).build());
        return new IssuedProof(token, expiry);
    }

    @Transactional
    public ClaimedCustomer redeem(UserPrincipal actor, String token) {
        UUID userId = UUID.fromString(actor.id());
        String digest = digest(token);
        UUID customerId = claims.findCustomerIdForProof(digest, userId).orElseThrow(CustomerClaimService::missing);
        ReceptionCustomer customer = customers.lockById(customerId).orElseThrow(CustomerClaimService::missing);
        ReceptionCustomerClaim proof = claims.findByDigestAndTargetUserId(digest, userId)
                .orElseThrow(CustomerClaimService::missing);
        if (!proof.getPartnerId().equals(customer.getPartner().getId())) throw missing();
        Instant now = Instant.now();
        if (proof.getUsedAt() != null || proof.getRevokedAt() != null || customer.getClaimedUserId() != null) {
            throw unavailable();
        }
        if (!now.isBefore(proof.getExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.GONE, "O código expirou. Solicite outro no estabelecimento.");
        }
        if (!Boolean.TRUE.equals(customer.getPartner().getActive())) throw missing();
        proof.setUsedAt(now);
        customer.setClaimedUserId(userId);
        customer.setClaimedAt(now);
        return new ClaimedCustomer(customerId, proof.getPartnerId(), now);
    }

    @Transactional(readOnly = true)
    public List<ReceptionCustomerService.Membership> claimedBy(UserPrincipal actor) {
        return customers.findByClaimedUserId(UUID.fromString(actor.id())).stream()
                .map(customer -> new ReceptionCustomerService.Membership(customer.getId(), customer.getPartner().getId()))
                .toList();
    }

    private static String digest(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 indisponível", impossible);
        }
    }

    private static ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Cadastro ou código de vinculação não encontrado.");
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "O cadastro já foi vinculado ou o código foi substituído.");
    }

    public record IssuedProof(String token, Instant expiresAt) {}
    public record ClaimedCustomer(UUID customerId, UUID partnerId, Instant claimedAt) {}
}
