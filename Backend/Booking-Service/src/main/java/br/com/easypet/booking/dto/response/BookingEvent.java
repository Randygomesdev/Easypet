package br.com.easypet.booking.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingEvent(
        UUID eventId,
        String eventType,
        int version,
        Instant occurredAt,
        UUID bookingId,
        long bookingVersion,
        UUID partnerId,
        UUID userId,
        LocalDateTime bookingDate,
        LocalDateTime previousBookingDate,
        String status) {}
