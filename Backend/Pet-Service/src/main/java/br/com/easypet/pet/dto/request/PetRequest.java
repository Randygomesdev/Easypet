package br.com.easypet.pet.dto.request;

import br.com.easypet.pet.domain.model.PetGender;
import br.com.easypet.pet.domain.model.PetSpecies;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record PetRequest(
        @NotBlank(message = "O nome é obrigatório")
        String name,

        String microchipNumber,

        @NotNull(message = "A espécie é obrigatória")
        PetSpecies species,

        @NotBlank(message = "A raça é obrigatória")
        String breed,

        @NotNull(message = "O gênero é obrigatório")
        PetGender gender,

        @NotNull(message = "O peso é obrigatório")
        @Positive(message = "O peso deve ser maior que zero")
        Double weight,

        @NotNull(message = "A data de nascimento é obrigatória")
        @PastOrPresent(message = "A data de nascimento não pode ser no futuro")
        LocalDate birthDate
) {}

