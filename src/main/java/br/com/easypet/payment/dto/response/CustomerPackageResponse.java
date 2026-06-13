package br.com.easypet.payment.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerPackageResponse(
    UUID id,
    UUID userId,
    UUID templateId,
    String templateName,
    UUID partnerId,
    UUID serviceId,
    Integer totalCredits,
    Integer remainingCredits,
    LocalDateTime expirationDate,
    String status
) {}
