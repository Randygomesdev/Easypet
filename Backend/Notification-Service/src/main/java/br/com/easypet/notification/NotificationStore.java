package br.com.easypet.notification;

import static br.com.easypet.notification.Delivery.Outcome;
import static br.com.easypet.notification.Delivery.Status;
import static br.com.easypet.notification.Delivery.Type;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class NotificationStore {
    private final JdbcTemplate jdbc;

    NotificationStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    record Booking(UUID id, long version, UUID partnerId, UUID userId) {}
    record Candidate(UUID id, UUID bookingId) {}
    record QueueCounts(long due, Instant oldestDueAt, long retryScheduled, long sending, long failed,
            long unknown, long unroutable) {}

    QueueCounts queueCounts(Instant now, Instant since) {
        return jdbc.queryForObject("""
                WITH due AS (
                    SELECT COUNT(*) AS total, MIN(d.due_at) AS oldest
                    FROM notification_delivery d JOIN notification_booking b ON b.id = d.booking_id
                    WHERE d.status IN ('PENDING', 'RETRY_SCHEDULED') AND d.due_at <= ?
                      AND (d.expires_at IS NULL OR d.expires_at > ?) AND d.booking_version = b.booking_version
                ), current_states AS (
                    SELECT COUNT(*) FILTER (WHERE status = 'RETRY_SCHEDULED') AS retries,
                           COUNT(*) FILTER (WHERE status = 'SENDING') AS sending
                    FROM notification_delivery WHERE status IN ('RETRY_SCHEDULED', 'SENDING')
                ), recent AS (
                    SELECT COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
                           COUNT(*) FILTER (WHERE status = 'UNKNOWN') AS unknown_count,
                           COUNT(*) FILTER (WHERE status = 'FAILED' AND last_error IN
                               ('RECIPIENT_UNAVAILABLE', 'RECIPIENT_DOMAIN_BLOCKED', 'EMAIL_INVALID')) AS unroutable
                    FROM notification_delivery WHERE status IN ('FAILED', 'UNKNOWN') AND updated_at >= ?
                )
                SELECT * FROM due CROSS JOIN current_states CROSS JOIN recent
                """, (rs, row) -> new QueueCounts(rs.getLong("total"), instant(rs, "oldest"),
                rs.getLong("retries"), rs.getLong("sending"), rs.getLong("failed"), rs.getLong("unknown_count"),
                rs.getLong("unroutable")), timestamp(now), timestamp(now), timestamp(since));
    }

    void ensureBooking(BookingEvent event) {
        jdbc.update("""
                INSERT INTO notification_booking (id, booking_version, partner_id, user_id) VALUES (?, 0, ?, ?)
                ON CONFLICT DO NOTHING
                """, event.bookingId(), event.partnerId(), event.userId());
    }

    Booking lockBooking(UUID bookingId) {
        return jdbc.queryForObject("SELECT * FROM notification_booking WHERE id = ? FOR UPDATE",
                (rs, row) -> new Booking(uuid(rs, "id"), rs.getLong("booking_version"),
                        uuid(rs, "partner_id"), uuid(rs, "user_id")), bookingId);
    }

    boolean recordEvent(BookingEvent event, Instant now) {
        return jdbc.update("""
                INSERT INTO notification_event (id, booking_id, booking_version, consumed_at) VALUES (?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """, event.eventId(), event.bookingId(), event.bookingVersion(), timestamp(now)) == 1;
    }

    void advanceBooking(BookingEvent event) {
        jdbc.update("UPDATE notification_booking SET booking_version = ?, user_id = ? WHERE id = ?",
                event.bookingVersion(), event.userId(), event.bookingId());
    }

    void enqueue(BookingEvent event, Type type, Instant now, Instant due, Instant expires) {
        jdbc.update("""
                INSERT INTO notification_delivery (id, event_id, booking_id, booking_version, type, status,
                    booking_date, due_at, expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), event.eventId(), event.bookingId(), event.bookingVersion(), type.name(),
                event.bookingDate(), timestamp(due), timestamp(expires), timestamp(now), timestamp(now));
    }

    void supersedePrevious(BookingEvent event, Instant now) {
        jdbc.update("""
                UPDATE notification_delivery
                SET status = 'SUPERSEDED', updated_at = ?
                WHERE booking_id = ? AND booking_version < ?
                  AND status IN ('PENDING', 'RETRY_SCHEDULED', 'FAILED')
                """, timestamp(now), event.bookingId(), event.bookingVersion());
    }

    List<Candidate> dueCandidates(Instant now, int limit) {
        return jdbc.query("""
                SELECT id, booking_id FROM notification_delivery
                WHERE status IN ('PENDING', 'RETRY_SCHEDULED') AND due_at <= ?
                ORDER BY due_at, id LIMIT ?
                """, (rs, row) -> new Candidate(uuid(rs, "id"), uuid(rs, "booking_id")),
                timestamp(now), limit);
    }

    List<Candidate> abandonedCandidates(Instant abandonedBefore, int limit) {
        return jdbc.query("""
                SELECT id, booking_id FROM notification_delivery
                WHERE status = 'SENDING' AND updated_at <= ?
                ORDER BY updated_at, id LIMIT ?
                """, (rs, row) -> new Candidate(uuid(rs, "id"), uuid(rs, "booking_id")),
                timestamp(abandonedBefore), limit);
    }

    Optional<Delivery> find(UUID id) {
        return jdbc.query("SELECT * FROM notification_delivery WHERE id = ?", this::mapDelivery, id)
                .stream().findFirst();
    }

    List<Delivery> list(UUID bookingId, int page, int size) {
        return jdbc.query("""
                SELECT * FROM notification_delivery WHERE booking_id = ?
                ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
                """, this::mapDelivery, bookingId, size, (long) page * size);
    }

    long count(UUID bookingId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM notification_delivery WHERE booking_id = ?",
                Long.class, bookingId);
    }

    boolean isCurrent(Delivery delivery, Booking booking) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT booking_version = ? FROM notification_delivery WHERE id = ?
                """, Boolean.class, booking.version(), delivery.id()));
    }

    void start(Delivery delivery, Instant now) {
        jdbc.update("""
                UPDATE notification_delivery
                SET status = 'SENDING', updated_at = ?, attempt_count = attempt_count + 1,
                    cycle_attempt_count = cycle_attempt_count + 1
                WHERE id = ?
                """, timestamp(now), delivery.id());
        jdbc.update("""
                INSERT INTO notification_attempt (delivery_id, attempt_number, started_at, outcome)
                VALUES (?, ?, ?, 'STARTED')
                """, delivery.id(), delivery.attemptCount() + 1, timestamp(now));
    }

    void finish(Delivery delivery, Status status, Outcome outcome, Instant now, Instant due, String error) {
        jdbc.update("""
                UPDATE notification_attempt SET finished_at = ?, outcome = ?, error = ?
                WHERE delivery_id = ? AND attempt_number = ?
                """, timestamp(now), outcome.name(), error, delivery.id(), delivery.attemptCount());
        jdbc.update("""
                UPDATE notification_delivery SET status = ?, updated_at = ?, due_at = ?, last_error = ?
                WHERE id = ?
                """, status.name(), timestamp(now), timestamp(due), error, delivery.id());
    }

    void supersede(Delivery delivery, Instant now) {
        jdbc.update("UPDATE notification_delivery SET status = 'SUPERSEDED', updated_at = ? WHERE id = ?",
                timestamp(now), delivery.id());
    }

    List<Delivery.Attempt> attempts(UUID deliveryId) {
        return jdbc.query("""
                SELECT * FROM notification_attempt WHERE delivery_id = ? ORDER BY attempt_number DESC
                """, (rs, row) -> new Delivery.Attempt(rs.getInt("attempt_number"), instant(rs, "started_at"),
                instant(rs, "finished_at"), Outcome.valueOf(rs.getString("outcome")), rs.getString("error")),
                deliveryId);
    }

    Optional<UUID> retryActor(UUID id, UUID key) {
        return jdbc.query("SELECT actor_id FROM notification_retry WHERE delivery_id = ? AND request_id = ?",
                (rs, row) -> uuid(rs, "actor_id"), id, key).stream().findFirst();
    }

    void retry(UUID id, UUID key, UUID actor, Instant now) {
        jdbc.update("""
                INSERT INTO notification_retry (delivery_id, request_id, actor_id, requested_at) VALUES (?, ?, ?, ?)
                """, id, key, actor, timestamp(now));
        jdbc.update("""
                UPDATE notification_delivery SET status = 'PENDING', updated_at = ?, due_at = ?,
                    cycle_attempt_count = 0, last_error = NULL WHERE id = ?
                """, timestamp(now), timestamp(now), id);
    }

    private Delivery mapDelivery(ResultSet rs, int row) throws SQLException {
        return new Delivery(uuid(rs, "id"), uuid(rs, "booking_id"),
                Type.valueOf(rs.getString("type")), Status.valueOf(rs.getString("status")),
                rs.getObject("booking_date", LocalDateTime.class), instant(rs, "expires_at"), instant(rs, "due_at"),
                instant(rs, "updated_at"), rs.getInt("attempt_count"), rs.getInt("cycle_attempt_count"),
                rs.getString("last_error"));
    }

    private static UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    static OffsetDateTime timestamp(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }
}
