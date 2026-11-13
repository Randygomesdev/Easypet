package br.com.easypet.partner.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reception_customers", uniqueConstraints = {
        @UniqueConstraint(name = "reception_customers_email_unique", columnNames = {"partner_id", "name_key", "email"}),
        @UniqueConstraint(name = "reception_customers_phone_unique", columnNames = {"partner_id", "name_key", "phone"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ReceptionCustomer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false, updatable = false)
    private Partner partner;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "name_key", nullable = false, length = 300)
    private String nameKey;

    @Column(length = 254)
    private String email;

    @Column(length = 15)
    private String phone;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private UUID claimedUserId;
    private Instant claimedAt;
}
