package br.com.easypet.partner.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ReceptionCustomerRequest(
        @NotBlank(message = "Informe o nome do tutor.") @Size(max = 150) String name,
        @Email(message = "Informe um e-mail válido.") @Size(max = 254) String email,
        @Pattern(regexp = "[0-9+() .-]*", message = "Informe um telefone válido.") @Size(max = 40) String phone
) {}
