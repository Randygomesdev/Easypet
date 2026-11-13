package br.com.easypet.pet.dto.response;

import br.com.easypet.pet.domain.model.AppointmentStatus;
import br.com.easypet.pet.domain.model.HistorySource;
import java.time.LocalDateTime;
import java.util.UUID;

public record SurgeryResponse(
    UUID id,
    String description,
    LocalDateTime date,
    String vetName,
    UUID providerId,
    String anesthesiaType,
    String postOperativeInstructions,
    AppointmentStatus status,
    Boolean certified,
    HistorySource source,
    String partnerName,
    UUID bookingId
) {}
