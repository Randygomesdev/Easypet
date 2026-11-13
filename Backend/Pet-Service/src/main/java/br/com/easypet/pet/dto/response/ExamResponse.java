package br.com.easypet.pet.dto.response;

import br.com.easypet.pet.domain.model.HistorySource;
import java.time.LocalDateTime;
import java.util.UUID;

public record ExamResponse(
    UUID id,
    String examName,
    LocalDateTime date,
    String laboratory,
    String veterinarianName,
    String resultsSummary,
    String fileUrl,
    Boolean certified,
    HistorySource source,
    String partnerName,
    UUID bookingId
) {}
