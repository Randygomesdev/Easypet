package br.com.easypet.pet.domain.entity;

import br.com.easypet.pet.domain.model.PetGender;
import br.com.easypet.pet.domain.model.PetSpecies;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pets")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "microchip_number", unique = true)
    private String microchipNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PetSpecies species;

    @Column(nullable = false)
    private String breed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PetGender gender;

    @Column(nullable = false)
    private Double weight;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Column(name = "picture_url")
    private String pictureUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private UUID ownerId;

    @OneToMany(mappedBy = "pet", cascade = CascadeType.ALL)
    private List<Vaccine> vaccinations;
    
    @OneToMany(mappedBy = "pet", cascade = CascadeType.ALL)
    private List<WeightRecord> weightRecords;

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
