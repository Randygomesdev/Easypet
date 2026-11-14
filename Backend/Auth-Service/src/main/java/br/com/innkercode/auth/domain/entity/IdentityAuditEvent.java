package br.com.innkercode.auth.domain.entity;

import br.com.innkercode.auth.domain.model.IdentityAuditAction;
import br.com.innkercode.auth.domain.model.IdentityAuditTarget;
import br.com.innkercode.auth.domain.model.TeamAccessRole;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;
import br.com.innkercode.auth.domain.model.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Entity
@Table(name = "identity_audit_events")
public class IdentityAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private Instant occurredAt;

    @Column(nullable = false, updatable = false)
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private UserRole actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private IdentityAuditTarget targetType;

    @Column(nullable = false, updatable = false)
    private UUID targetId;

    @Column(updatable = false)
    private UUID targetUserId;

    @Column(updatable = false)
    private UUID partnerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private IdentityAuditAction action;

    @Column(updatable = false)
    private Boolean beforeActive;

    @Column(updatable = false)
    private Boolean afterActive;

    @Enumerated(EnumType.STRING)
    @Column(updatable = false)
    private TeamAccessStatus beforeStatus;

    @Enumerated(EnumType.STRING)
    @Column(updatable = false)
    private TeamAccessStatus afterStatus;

    @Enumerated(EnumType.STRING)
    @Column(updatable = false)
    private TeamAccessRole accessRole;

    @Column(nullable = false, length = 300, updatable = false)
    private String reason;
}
