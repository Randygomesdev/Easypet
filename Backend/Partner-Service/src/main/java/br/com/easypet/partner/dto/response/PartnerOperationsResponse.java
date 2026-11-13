package br.com.easypet.partner.dto.response;

import br.com.easypet.partner.domain.model.BillingUnit;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PartnerOperationsResponse(
        UUID id,
        String name,
        Integer boardingCapacity,
        List<PartnerBusinessHourResponse> businessHours,
        List<OfferedService> services,
        Boolean active
) {
    public record OfferedService(
            UUID id, String name, BigDecimal price, Integer durationMinutes, BillingUnit billingUnit
    ) {}
}
