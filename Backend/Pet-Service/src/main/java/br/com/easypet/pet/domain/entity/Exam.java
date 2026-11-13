package br.com.easypet.pet.domain.entity;

import br.com.easypet.pet.domain.model.HistorySource;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "exams")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @Column(nullable = false)
    private String examName;

    @Column(nullable = false)
    private LocalDateTime date;

    private String laboratory;
    private String vetName;

    @Column(length = 1000)
    private String resultsSummary;

    private String fileUrl;

    private Boolean certified;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 10)
    private HistorySource source;

    @Column(name = "partner_name")
    private String partnerName;

    @Column(name = "booking_id")
    private UUID bookingId;

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
