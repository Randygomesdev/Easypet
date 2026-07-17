package br.com.easypet.payment.client.dto;

import java.util.List;
import java.util.UUID;

public record PartnerResponseDto(
    UUID id,
    String name,
    List<ServiceResponseDto> services
) {}
