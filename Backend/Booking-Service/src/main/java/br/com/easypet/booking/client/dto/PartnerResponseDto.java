package br.com.easypet.booking.client.dto;

import br.com.easypet.booking.dto.response.PartnerBusinessHourIntegrationResponse;

import java.util.List;
import java.util.UUID;

public record PartnerResponseDto(
    UUID id,
    String name,
    Integer boardingCapacity,
    List<PartnerBusinessHourIntegrationResponse> businessHours,
    List<ServiceResponseDto> services,
    Boolean active
) {}
