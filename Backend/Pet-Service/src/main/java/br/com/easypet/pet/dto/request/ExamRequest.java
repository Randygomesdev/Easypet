package br.com.easypet.pet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record ExamRequest(
    @NotBlank 
    String examName,

    @NotNull 
    LocalDateTime date,

    String laboratory,

    String veterinarianName,

    String resultsSummary,
    String fileUrl,
    String partnerName,
    java.util.UUID bookingId
) {}
