package br.com.easypet.partner.domain.entity;

import br.com.easypet.partner.domain.model.StaffStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "staff")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private Partner partner;

    @Column(nullable = false)
    private String name;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "speciality")
    private String speciality;

    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "whatsapp")
    private String whatsapp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StaffStatus status = StaffStatus.ACTIVE;

    @ManyToMany
    @JoinTable(
        name = "staff_service",
        joinColumns = @JoinColumn(name = "staff_id"),
        inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<ServiceOffer> services;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
