package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


public record RegisterRequest(

        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 255)
        String name,

        @NotBlank(message = "O email é obrigatório")
        @Email(message = "Email inválido")
        @Size(max = 255)
        String email,

        @NotBlank(message = "A senha é obrigatória")
        @Size(min = 6, message = "A senha deve ter pelo menos 6 caracteres")
        String password
) {}
