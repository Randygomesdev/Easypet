package br.com.easypet.payment.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record PackageTemplateResponse(
    UUID id,
    UUID partnerId,
    String name,
    String description,
    UUID serviceId,
    Integer quantity,
    BigDecimal price,
    Integer validityDays,
    Boolean isActive
) {}
