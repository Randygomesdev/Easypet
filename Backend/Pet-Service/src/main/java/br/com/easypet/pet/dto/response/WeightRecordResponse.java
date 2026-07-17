package br.com.easypet.pet.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record WeightRecordResponse(
        UUID id,
        LocalDate date,
        Double weight
) {
}
