package br.com.easypet.pet.domain.entity;

import br.com.easypet.pet.domain.model.AppointmentStatus; // Podemos reaproveitar o enum
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "surgeries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Surgery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDateTime date;

    private String vetName;
    private UUID providerId;

    private String anesthesiaType;

    @Column(length = 2000)
    private String postOperativeInstructions;

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status;

    private Boolean certified;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
