package br.com.easypet.pet.dto.request;

import br.com.easypet.pet.domain.model.AppointmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record SurgeryRequest(

    @NotBlank 
    String description,

    @NotNull 
    LocalDateTime date,

    String vetName,

    UUID providerId,

    String anesthesiaType,

    String postOperativeInstructions,

    @NotNull 
    AppointmentStatus status
) {}
