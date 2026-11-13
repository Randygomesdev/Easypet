package br.com.easypet.pet.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record WeightRecordRequest(
    @NotNull LocalDate date,
    @NotNull Double weight,
    String partnerName,
    UUID bookingId
) {}
