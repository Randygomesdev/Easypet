package br.com.innkercode.auth.domain.entity;

import br.com.innkercode.auth.domain.model.TeamAccessRole;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;
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
@Table(name = "team_accesses")
public class TeamAccess extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID partnerId;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TeamAccessRole accessRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TeamAccessStatus status;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    private UUID userId;

    @Column(nullable = false)
    private UUID createdBy;

    private UUID revokedBy;

    public void activate(UUID accountId) {
        userId = accountId;
        status = TeamAccessStatus.ACTIVE;
    }

    public void revoke(UUID ownerId) {
        status = TeamAccessStatus.REVOKED;
        revokedBy = ownerId;
    }

    public TeamAccessStatus statusAt(Instant now) {
        if (status == TeamAccessStatus.PENDING && !expiresAt.isAfter(now)) {
            return TeamAccessStatus.EXPIRED;
        }
        return status;
    }
}
