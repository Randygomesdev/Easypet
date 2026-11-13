package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.NotNull;

public record SetCustomerActiveRequest(@NotNull Boolean active) {}
