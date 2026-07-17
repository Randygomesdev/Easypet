package br.com.easypet.payment.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record PackageTemplateRequest(
    @NotNull(message = "O ID do parceiro é obrigatório")
    UUID partnerId,

    @NotBlank(message = "O nome do pacote é obrigatório")
    @Size(min = 3, max = 255, message = "O nome deve ter entre 3 e 255 caracteres")
    String name,

    String description,

    @NotNull(message = "O ID do serviço associado é obrigatório")
    UUID serviceId,

    @NotNull(message = "A quantidade de créditos é obrigatória")
    @Min(value = 1, message = "A quantidade de créditos deve ser de no mínimo 1")
    Integer quantity,

    @NotNull(message = "O preço do pacote é obrigatório")
    @DecimalMin(value = "0.01", message = "O preço do pacote deve ser maior que zero")
    BigDecimal price,

    @NotNull(message = "Os dias de validade são obrigatórios")
    @Min(value = 1, message = "A validade deve ser de no mínimo 1 dia")
    Integer validityDays
) {}
