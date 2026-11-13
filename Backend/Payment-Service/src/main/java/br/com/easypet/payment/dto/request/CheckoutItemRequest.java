package br.com.easypet.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.Map;

public record CheckoutItemRequest(
    @NotBlank String productId,
    @NotBlank String label,
    String description,
    @NotNull @Positive BigDecimal price,
    @Positive int quantity,
    Map<String, Object> metadata
) {}
