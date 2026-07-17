package br.com.easypet.partner.domain.entity;

import br.com.easypet.partner.domain.model.PartnerCategory;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "partners")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Partner {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String cnpj;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "state_registration")
    private String stateRegistration;

    @Column(name = "state_registration_exempt")
    private Boolean stateRegistrationExempt = false;

    @Column(name = "municipal_registration")
    private String municipalRegistration;

    @Column(name = "municipal_registration_exempt")
    private Boolean municipalRegistrationExempt = false;

    private String email;

    @Column(name = "contact_phone")
    private String contactPhone;

    private String description;
    private String address;
    private String number;
    private String neighborhood;
    private String complement;
    private String city;
    private String state;
    
    private String phone;
    
    private Double latitude;
    private Double longitude;
    
    @ElementCollection
    @CollectionTable(name = "partner_business_hours", joinColumns = @JoinColumn(name = "partner_id"))
    @Builder.Default
    private java.util.List<PartnerBusinessHour> businessHours = new java.util.ArrayList<>();
    
    @Column(name = "zip_code")
    private String zipCode;

    @ElementCollection(targetClass = PartnerCategory.class)
    @CollectionTable(name = "partner_categories", joinColumns = @JoinColumn(name = "partner_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private Set<PartnerCategory> categories;

    @ElementCollection
    @CollectionTable(name = "partner_modules", joinColumns = @JoinColumn(name = "partner_id"))
    @Column(name = "module_name")
    private Set<String> activeModules;

    @ElementCollection
    @CollectionTable(name = "partner_gallery", joinColumns = @JoinColumn(name = "partner_id"))
    @Column(name = "picture_url")
    private Set<String> galleryPictures;

    @Builder.Default
    private Double rating = 0.0;

    @Column(name = "picture_url")
    private String pictureUrl;

    @Column(name = "boarding_capacity")
    private Integer boardingCapacity;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "active")
    private Boolean active = true;

    @OneToMany(mappedBy = "partner", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServiceOffer> services;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
