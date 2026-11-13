package br.com.easypet.booking.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingHistoryEntry(
        String action,
        Instant recordedAt,
        String previousStatus,
        String status,
        LocalDateTime previousBookingDate,
        LocalDateTime bookingDate,
        LocalDateTime previousScheduledEnd,
        LocalDateTime scheduledEnd,
        UUID previousStaffId,
        UUID staffId,
        String reason) {}
