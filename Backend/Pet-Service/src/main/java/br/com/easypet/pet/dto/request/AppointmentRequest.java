package br.com.easypet.pet.dto.request;

import br.com.easypet.pet.domain.model.AppointmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record AppointmentRequest(
    @NotNull 
    LocalDateTime date,

    @NotBlank 
    String reason,
    
    String clinicalNotes,

    String vetName,

    UUID providerId,

    Double weightAtTime,

    @NotNull 
    AppointmentStatus status
) {}
