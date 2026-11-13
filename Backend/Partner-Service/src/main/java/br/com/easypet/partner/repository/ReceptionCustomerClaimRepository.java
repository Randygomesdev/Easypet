package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.ReceptionCustomerClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ReceptionCustomerClaimRepository extends JpaRepository<ReceptionCustomerClaim, UUID> {
    Optional<ReceptionCustomerClaim> findByDigestAndTargetUserId(String digest, UUID userId);

    @Query("select claim.customerId from ReceptionCustomerClaim claim where claim.digest = :digest and claim.targetUserId = :userId")
    Optional<UUID> findCustomerIdForProof(String digest, UUID userId);

    @Modifying
    @Query("update ReceptionCustomerClaim claim set claim.revokedAt = :now where claim.customerId = :customerId "
            + "and claim.usedAt is null and claim.revokedAt is null and claim.expiresAt > :now")
    void revokeOpen(UUID customerId, Instant now);
}
