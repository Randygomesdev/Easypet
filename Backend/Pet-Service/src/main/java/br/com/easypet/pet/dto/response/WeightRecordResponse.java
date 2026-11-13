package br.com.easypet.pet.dto.response;

import br.com.easypet.pet.domain.model.HistorySource;
import java.time.LocalDate;
import java.util.UUID;

public record WeightRecordResponse(
    UUID id,
    LocalDate date,
    Double weight,
    HistorySource source,
    String partnerName,
    UUID bookingId
) {}
