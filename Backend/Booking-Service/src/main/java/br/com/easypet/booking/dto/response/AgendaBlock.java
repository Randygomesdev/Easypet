package br.com.easypet.booking.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record AgendaBlock(UUID id, UUID partnerId, UUID staffId, LocalDateTime start, LocalDateTime end, String reason) {}
