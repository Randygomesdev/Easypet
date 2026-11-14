package br.com.easypet.booking.dto;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.domain.enums.BookingType;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public final class BookingInvestigation {
    private BookingInvestigation() {}

    public record Summary(UUID bookingId, UUID partnerId, BookingStatus status, BookingType type,
                          LocalDateTime bookingDate, LocalDateTime scheduledEnd, long bookingVersion,
                          LocalDateTime updatedAt) {
        public static Summary from(Booking booking) {
            return new Summary(booking.getId(), booking.getPartnerId(), booking.getStatus(), booking.getType(),
                    booking.getBookingDate(), booking.getScheduledEnd(), booking.getEventVersion(), booking.getUpdatedAt());
        }
    }

    public record History(UUID actorId, String action, Instant recordedAt, String previousStatus, String status,
                          LocalDateTime previousBookingDate, LocalDateTime bookingDate,
                          LocalDateTime previousScheduledEnd, LocalDateTime scheduledEnd, String reason) {}

    public record Detail(Summary booking, String reason, Instant interruptedAt, Page<History> history,
                         Page<BookingExtras.Audit> extras) {}
}
