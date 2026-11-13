package br.com.easypet.payment.dto.response;

import java.util.UUID;

public record CheckoutResponse(
    UUID transactionId,
    String preferenceId,
    String initPoint,
    String sandboxInitPoint
) {}
