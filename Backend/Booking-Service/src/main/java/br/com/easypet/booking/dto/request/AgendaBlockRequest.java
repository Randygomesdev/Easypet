package br.com.easypet.booking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public record AgendaBlockRequest(
        @NotNull LocalDateTime start,
        @NotNull LocalDateTime end,
        UUID staffId,
        @NotBlank @Size(max = 500) String reason) {}
