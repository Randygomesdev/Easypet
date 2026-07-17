package br.com.easypet.partner.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record StaffAbsenceRequest(
    @NotNull(message = "A data de início é obrigatória")
    LocalDateTime startDate,
    @NotNull(message = "A data de término é obrigatória")
    LocalDateTime endDate,
    String reason
) {}
