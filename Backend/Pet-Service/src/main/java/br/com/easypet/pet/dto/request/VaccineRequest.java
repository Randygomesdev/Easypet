package br.com.easypet.pet.dto.request;

import br.com.easypet.pet.domain.model.VaccineStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
public record VaccineRequest(
        @NotBlank
        String name,

        @NotNull
        LocalDate applicationDate,

        @NotNull
        LocalDate nextDoseDate,

        @NotNull
        VaccineStatus status,

        String vetName,
        String manufacturer,
        String lot,
        String observations
) {}
