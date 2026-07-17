package br.com.easypet.partner.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record StaffAbsenceResponse(
    UUID id,
    UUID staffId,
    LocalDateTime startDate,
    LocalDateTime endDate,
    String reason
) {}
