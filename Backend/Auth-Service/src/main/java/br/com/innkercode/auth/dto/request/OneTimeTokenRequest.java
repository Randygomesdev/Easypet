package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OneTimeTokenRequest(
        @NotBlank @Size(max = 255) String token
) {}
