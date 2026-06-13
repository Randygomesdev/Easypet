package br.com.easypet.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreditConsumeRequest(
    @NotNull(message = "O ID do usuário é obrigatório")
    UUID userId,

    @NotNull(message = "O ID do parceiro é obrigatório")
    UUID partnerId,

    @NotNull(message = "O ID do serviço é obrigatório")
    UUID serviceId
) {}
