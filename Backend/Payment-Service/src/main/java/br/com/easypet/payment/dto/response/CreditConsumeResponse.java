package br.com.easypet.payment.dto.response;

import java.util.UUID;

public record CreditConsumeResponse(
    UUID customerPackageId,
    Integer remainingCredits,
    Boolean success
) {}
