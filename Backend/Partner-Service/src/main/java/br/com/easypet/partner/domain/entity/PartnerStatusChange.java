package br.com.easypet.partner.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "partner_status_changes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class PartnerStatusChange {
    @Id
    private UUID id;
    private UUID partnerId;
    private UUID actorId;
    private boolean previousActive;
    private boolean active;
    @Column(nullable = false, length = 500)
    private String reason;
    private Instant changedAt;
}
