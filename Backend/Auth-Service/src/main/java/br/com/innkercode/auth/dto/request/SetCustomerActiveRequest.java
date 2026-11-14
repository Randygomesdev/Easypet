package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SetCustomerActiveRequest(@NotNull Boolean active, @Size(max = 300) String reason) {}
