package br.com.easypet.partner.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reception_customer_claims")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ReceptionCustomerClaim {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private UUID customerId;

    @Column(nullable = false, updatable = false)
    private UUID partnerId;

    @Column(nullable = false, updatable = false)
    private UUID targetUserId;

    @Column(nullable = false, updatable = false)
    private UUID issuedBy;

    @Column(nullable = false, updatable = false, unique = true, length = 64)
    private String digest;

    @Column(nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(nullable = false, updatable = false)
    private Instant expiresAt;

    @Setter
    private Instant usedAt;

    private Instant revokedAt;
}
