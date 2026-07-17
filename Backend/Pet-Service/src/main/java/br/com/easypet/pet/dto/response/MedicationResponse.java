package br.com.easypet.pet.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record MedicationResponse(
    UUID id,
    String name,
    String dosage,
    String frequency,
    LocalDate startDate,
    LocalDate endDate,
    String observations,
    Boolean active,
    UUID appointmentId
) {}
