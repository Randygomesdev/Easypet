package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.ReceptionNotificationAuthorization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ReceptionNotificationAuthorizationRepository
        extends JpaRepository<ReceptionNotificationAuthorization, UUID> {

    Optional<ReceptionNotificationAuthorization> findFirstByCustomerIdOrderByRevisionDesc(UUID customerId);

    @Query("""
            select a from ReceptionNotificationAuthorization a, ReceptionCustomer c
            where a.customerId = c.id and c.id = :customerId and c.partner.id = :partnerId
              and c.partner.active = true and c.claimedUserId is null
              and a.email = c.email and a.revokedAt is null
            """)
    Optional<ReceptionNotificationAuthorization> findRecipient(UUID partnerId, UUID customerId);
}
