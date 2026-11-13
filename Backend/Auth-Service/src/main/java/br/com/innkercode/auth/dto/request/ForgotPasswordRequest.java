package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "O email é obrigatório")
        @Email(message = "O email deve ser válido")
        @Size(max = 255)
        String email
) {
}
