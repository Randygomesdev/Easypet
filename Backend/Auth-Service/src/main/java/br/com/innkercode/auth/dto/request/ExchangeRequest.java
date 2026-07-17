package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ExchangeRequest(
        @NotBlank(message = "O código de troca é obrigatório")
        String code
) {}
