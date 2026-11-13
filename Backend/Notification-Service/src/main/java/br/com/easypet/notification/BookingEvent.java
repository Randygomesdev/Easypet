package br.com.easypet.notification;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

record BookingEvent(
        UUID eventId,
        Type eventType,
        int version,
        Instant occurredAt,
        UUID bookingId,
        long bookingVersion,
        UUID partnerId,
        UUID userId,
        LocalDateTime bookingDate,
        LocalDateTime previousBookingDate,
        String status
) {
    enum Type {
        BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, BOOKING_NO_SHOW, BOOKING_READY
    }

    void validate() {
        if (version != 1 || bookingVersion < 1 || eventId == null || eventType == null
                || bookingId == null || partnerId == null || occurredAt == null || bookingDate == null
                || !validStatus()) {
            throw new IllegalArgumentException("Evento de reserva inválido");
        }
    }

    private boolean validStatus() {
        return switch (eventType) {
            case BOOKING_CREATED -> Objects.equals(status, "PENDING") || Objects.equals(status, "CONFIRMED");
            case BOOKING_CONFIRMED -> Objects.equals(status, "CONFIRMED");
            case BOOKING_RESCHEDULED -> previousBookingDate != null
                    && (Objects.equals(status, "CONFIRMED") || Objects.equals(status, "PENDING"));
            case BOOKING_CANCELLED -> Objects.equals(status, "CANCELLED");
            case BOOKING_NO_SHOW -> Objects.equals(status, "NO_SHOW");
            case BOOKING_READY -> Objects.equals(status, "IN_PROGRESS");
        };
    }
}
