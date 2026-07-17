package br.com.easypet.payment.domain.entity;

import br.com.easypet.payment.domain.enums.CustomerPackageStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "customer_packages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerPackage {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_template_id", nullable = false)
    private PackageTemplate packageTemplate;

    @Column(name = "partner_id", nullable = false)
    private UUID partnerId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "total_credits", nullable = false)
    private Integer totalCredits;

    @Column(name = "remaining_credits", nullable = false)
    private Integer remainingCredits;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private PaymentTransaction transaction;

    @Column(name = "expiration_date", nullable = false)
    private LocalDateTime expirationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CustomerPackageStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public boolean isExpired() {
        return expirationDate != null && expirationDate.isBefore(LocalDateTime.now());
    }

    public boolean hasCredits() {
        return remainingCredits != null && remainingCredits > 0;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
