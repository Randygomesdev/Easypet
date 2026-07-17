package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.model.BillingUnit;
import java.math.BigDecimal;
import java.util.UUID;

public record ServiceResponse(
    UUID id,
    String name,
    String description,
    BigDecimal price,
    Integer durationMinutes,
    BillingUnit billingUnit
) {}
