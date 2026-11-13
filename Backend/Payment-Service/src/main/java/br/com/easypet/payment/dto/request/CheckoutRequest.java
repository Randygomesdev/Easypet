package br.com.easypet.payment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CheckoutRequest(
    @NotEmpty @Valid List<CheckoutItemRequest> items,
    String successUrl,
    String failureUrl,
    String pendingUrl
) {}
