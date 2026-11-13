package br.com.easypet.booking.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

public record BookingCheckIn(
        @AssertTrue(message = "Confirme a identificação do pet.") boolean petIdentified,
        @AssertTrue(message = "Confirme as orientações de entrada.") boolean instructionsConfirmed,
        @Size(max = 1000) String allergies,
        @Size(max = 1000) String behavior,
        @Size(max = 1000) String authorizedExtras,
        @Size(max = 1000) String observations) {}
