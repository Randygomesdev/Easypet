package br.com.easypet.pet.dto.response;

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
    Boolean certified
) {}
