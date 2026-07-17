package br.com.easypet.pet.dto.response;

import br.com.easypet.pet.domain.model.AppointmentStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record AppointmentResponse(
    UUID id,
    LocalDateTime date,
    String reason,
    String clinicalNotes,
    String vetName,
    UUID providerId,
    Double weightAtTime,
    AppointmentStatus status,
    Boolean certified,
    LocalDateTime createdAt
) {}
