package br.com.easypet.partner.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

import java.time.DayOfWeek;

@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerBusinessHour {

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    private DayOfWeek dayOfWeek;

    @Column(name = "business_start_hour", length = 5)
    private String businessStartHour;

    @Column(name = "business_end_hour", length = 5)
    private String businessEndHour;

    @Column(name = "lunch_start_hour", length = 5)
    private String lunchStartHour;

    @Column(name = "lunch_end_hour", length = 5)
    private String lunchEndHour;

    @Column(name = "closed", nullable = false)
    @Builder.Default
    private boolean closed = false;
}
