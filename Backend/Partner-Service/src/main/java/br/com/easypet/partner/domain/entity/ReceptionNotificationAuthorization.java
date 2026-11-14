package br.com.easypet.partner.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reception_notification_authorizations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"customer_id", "revision"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReceptionNotificationAuthorization {
    @Id private UUID id;
    @Column(nullable = false, updatable = false) private UUID customerId;
    @Column(nullable = false, updatable = false, length = 254) private String email;
    @Column(nullable = false, updatable = false, length = 20) private String channel;
    @Column(nullable = false) private long revision;
    @Column(nullable = false, updatable = false) private UUID grantedBy;
    @Column(nullable = false, updatable = false) private Instant grantedAt;
    private UUID revokedBy;
    private Instant revokedAt;

    public ReceptionNotificationAuthorization(UUID customerId, String email, long revision, UUID actor, Instant now) {
        this.id = UUID.randomUUID();
        this.customerId = customerId;
        this.email = email;
        this.channel = "IN_PERSON";
        this.revision = revision;
        this.grantedBy = actor;
        this.grantedAt = now;
    }

    public void revoke(UUID actor, Instant now) {
        revokedBy = actor;
        revokedAt = now;
        revision++;
    }
}
