package br.com.easypet.partner.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
    @NotNull(message = "A nota (rating) é obrigatória")
    @Min(value = 1, message = "A nota mínima é 1")
    @Max(value = 5, message = "A nota máxima é 5")
    Integer rating,

    @Size(max = 1000, message = "O comentário não pode exceder 1000 caracteres")
    String comment
    // authorName foi removido do body — é extraído automaticamente do token JWT
) {}
