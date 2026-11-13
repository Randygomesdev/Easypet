package br.com.easypet.booking.repository;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.dto.request.BookingCheckIn;
import br.com.easypet.booking.dto.response.AgendaBlock;
import br.com.easypet.booking.dto.response.BookingEvent;
import br.com.easypet.booking.dto.response.BookingHistoryEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import br.com.easypet.booking.exception.BookingUnavailableException;

import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class BookingAgendaStore {
    private final JdbcTemplate jdbc;

    @Value("${app.booking-agenda-lock-timeout}")
    private Duration lockTimeout;

    public void lockPartner(UUID partnerId) {
        // PostgreSQL also waits on the insert when another transaction is creating this partner's lock row.
        jdbc.queryForObject("SELECT set_config('lock_timeout', ?, true)", String.class, lockTimeout.toMillis() + "ms");
        try {
            jdbc.update("INSERT INTO booking_agenda_locks (partner_id) VALUES (?) ON CONFLICT DO NOTHING", partnerId);
            jdbc.queryForObject("SELECT partner_id FROM booking_agenda_locks WHERE partner_id = ? FOR UPDATE",
                    UUID.class, partnerId);
        } catch (DataAccessException ex) {
            if (ex.getMostSpecificCause() instanceof SQLException sql && "55P03".equals(sql.getSQLState())) {
                throw new BookingUnavailableException("A agenda está ocupada. Tente novamente.", ex);
            }
            throw ex;
        }
    }

    public record IdempotencyEntry(String requestHash, UUID bookingId) {}

    public Optional<IdempotencyEntry> findRequest(UUID partnerId, UUID actorId, String key) {
        return jdbc.query("""
                SELECT request_hash, booking_id FROM booking_idempotency
                WHERE partner_id = ? AND actor_id = ? AND request_key = ?
                """, (rs, row) -> new IdempotencyEntry(rs.getString("request_hash"), rs.getObject("booking_id", UUID.class)),
                partnerId, actorId, key).stream().findFirst();
    }

    public void saveRequest(UUID partnerId, UUID actorId, String key, String hash, UUID bookingId) {
        jdbc.update("""
                INSERT INTO booking_idempotency (partner_id, actor_id, request_key, request_hash, booking_id)
                VALUES (?, ?, ?, ?, ?)
                """, partnerId, actorId, key, hash, bookingId);
    }

    public List<AgendaBlock> findBlocks(UUID partnerId, LocalDateTime start, LocalDateTime end) {
        return jdbc.query("""
                SELECT * FROM booking_agenda_blocks WHERE partner_id = ?
                  AND starts_at < COALESCE(CAST(? AS TIMESTAMP), 'infinity'::timestamp)
                  AND ends_at > COALESCE(CAST(? AS TIMESTAMP), '-infinity'::timestamp)
                ORDER BY starts_at, id
                """, (rs, row) -> new AgendaBlock(
                rs.getObject("id", UUID.class), rs.getObject("partner_id", UUID.class), rs.getObject("staff_id", UUID.class),
                rs.getObject("starts_at", LocalDateTime.class), rs.getObject("ends_at", LocalDateTime.class),
                rs.getString("reason")), partnerId, end, start);
    }

    public void saveBlock(AgendaBlock block, UUID actorId) {
        jdbc.update("""
                INSERT INTO booking_agenda_blocks (id, partner_id, staff_id, starts_at, ends_at, reason, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, block.id(), block.partnerId(), block.staffId(), block.start(), block.end(), block.reason(), actorId);
    }

    public void deleteBlock(UUID partnerId, UUID id) {
        jdbc.update("DELETE FROM booking_agenda_blocks WHERE partner_id = ? AND id = ?", partnerId, id);
    }

    public Optional<BookingCheckIn> findCheckIn(UUID bookingId) {
        return jdbc.query("""
                SELECT * FROM booking_check_ins WHERE booking_id = ?
                """, (rs, row) -> new BookingCheckIn(
                rs.getBoolean("pet_identified"), rs.getBoolean("instructions_confirmed"), rs.getString("allergies"),
                rs.getString("behavior"), rs.getString("authorized_extras"), rs.getString("observations")),
                bookingId).stream().findFirst();
    }

    public void saveCheckIn(UUID bookingId, BookingCheckIn input, UUID actorId) {
        jdbc.update("""
                INSERT INTO booking_check_ins (booking_id, pet_identified, instructions_confirmed, allergies, behavior,
                    authorized_extras, observations, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (booking_id) DO UPDATE SET pet_identified = EXCLUDED.pet_identified,
                    instructions_confirmed = EXCLUDED.instructions_confirmed, allergies = EXCLUDED.allergies,
                    behavior = EXCLUDED.behavior, authorized_extras = EXCLUDED.authorized_extras,
                    observations = EXCLUDED.observations, updated_by = EXCLUDED.updated_by, updated_at = now()
                """, bookingId, input.petIdentified(), input.instructionsConfirmed(), input.allergies(),
                input.behavior(), input.authorizedExtras(), input.observations(), actorId);
    }

    public record Snapshot(String status, LocalDateTime bookingDate, LocalDateTime scheduledEnd, UUID staffId) {
        public static Snapshot of(Booking booking) {
            LocalDateTime end = booking.getScheduledEnd() == null ? booking.getCheckOut() : booking.getScheduledEnd();
            return new Snapshot(booking.getStatus().name(), booking.getBookingDate(), end, booking.getStaffId());
        }
    }

    public void addHistory(Booking booking, UUID actorId, String action, Snapshot previous, String reason) {
        jdbc.update("""
                INSERT INTO booking_history (booking_id, actor_id, action, previous_status, status,
                    previous_booking_date, booking_date, previous_scheduled_end, scheduled_end,
                    previous_staff_id, staff_id, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, booking.getId(), actorId, action, previous.status(), booking.getStatus().name(),
                previous.bookingDate(), booking.getBookingDate(), previous.scheduledEnd(), booking.getScheduledEnd(),
                previous.staffId(), booking.getStaffId(), reason);
    }

    public List<BookingHistoryEntry> findHistory(UUID bookingId) {
        return jdbc.query("""
                SELECT * FROM booking_history WHERE booking_id = ? ORDER BY id
                """, (rs, row) -> new BookingHistoryEntry(rs.getString("action"),
                rs.getObject("recorded_at", OffsetDateTime.class).toInstant(),
                rs.getString("previous_status"), rs.getString("status"),
                rs.getObject("previous_booking_date", LocalDateTime.class), rs.getObject("booking_date", LocalDateTime.class),
                rs.getObject("previous_scheduled_end", LocalDateTime.class), rs.getObject("scheduled_end", LocalDateTime.class),
                rs.getObject("previous_staff_id", UUID.class), rs.getObject("staff_id", UUID.class), rs.getString("reason")),
                bookingId);
    }

    public enum EventType {
        BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, BOOKING_NO_SHOW, BOOKING_READY
    }

    public void addEvent(Booking booking, EventType eventType, LocalDateTime previousBookingDate) {
        booking.setEventVersion(booking.getEventVersion() + 1);
        jdbc.update("""
                INSERT INTO booking_outbox (event_id, booking_id, booking_version, event_type, occurred_at,
                    partner_id, user_id, booking_date, previous_booking_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), booking.getId(), booking.getEventVersion(), eventType.name(),
                Instant.now().atOffset(ZoneOffset.UTC), booking.getPartnerId(), booking.getUserId(),
                booking.getBookingDate(), previousBookingDate, booking.getStatus().name());
    }

    public List<BookingEvent> pendingEvents(int limit) {
        return jdbc.query("""
                SELECT * FROM booking_outbox WHERE acknowledged_at IS NULL ORDER BY sequence_id LIMIT ?
                """, (rs, row) -> new BookingEvent(rs.getObject("event_id", UUID.class), rs.getString("event_type"), 1,
                rs.getObject("occurred_at", OffsetDateTime.class).toInstant(),
                rs.getObject("booking_id", UUID.class), rs.getLong("booking_version"),
                rs.getObject("partner_id", UUID.class), rs.getObject("user_id", UUID.class),
                rs.getObject("booking_date", LocalDateTime.class), rs.getObject("previous_booking_date", LocalDateTime.class),
                rs.getString("status")), limit);
    }

    public void acknowledge(UUID eventId) {
        jdbc.update("UPDATE booking_outbox SET acknowledged_at = now() WHERE event_id = ? AND acknowledged_at IS NULL", eventId);
    }
}
