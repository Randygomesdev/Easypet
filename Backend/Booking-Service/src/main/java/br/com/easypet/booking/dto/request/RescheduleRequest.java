package br.com.easypet.booking.dto.request;

import java.time.LocalDateTime;
import java.util.UUID;

public record RescheduleRequest(LocalDateTime bookingDate, LocalDateTime checkIn, LocalDateTime checkOut, UUID staffId) {}
