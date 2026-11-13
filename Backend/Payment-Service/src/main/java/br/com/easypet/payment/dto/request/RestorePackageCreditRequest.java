package br.com.easypet.payment.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record RestorePackageCreditRequest(
        @NotNull UUID customerPackageId
) {}
