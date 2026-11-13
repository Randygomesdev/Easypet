package br.com.easypet.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record AddCreditRequest(
        @NotNull UUID userId,
        @NotNull @Positive BigDecimal amount,
        String reason,
        UUID bookingId
) {}
