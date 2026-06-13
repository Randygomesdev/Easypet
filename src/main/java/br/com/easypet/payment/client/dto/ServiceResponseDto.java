package br.com.easypet.payment.client.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceResponseDto(
    UUID id,
    String name,
    String description,
    BigDecimal price,
    Integer durationMinutes
) {}
