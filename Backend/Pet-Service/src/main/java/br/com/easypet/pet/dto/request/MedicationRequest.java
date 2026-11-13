package br.com.easypet.pet.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.UUID;

public record MedicationRequest(

    @NotBlank 
    String name,

    @NotBlank 
    String dosage,

    @NotBlank 
    String frequency,

    LocalDate startDate,

    LocalDate endDate,

    String observations,

    Boolean active,
    UUID appointmentId,
    String partnerName,
    UUID bookingId
) {}
