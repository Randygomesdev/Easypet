package br.com.easypet.partner.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReviewResponse(
    UUID id,
    Integer rating,
    String comment,
    String authorName,
    LocalDateTime createdAt
) {}
