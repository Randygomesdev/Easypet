package br.com.easypet.booking.repository;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.dto.BookingExtras.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class BookingExtraStore {
    private final JdbcTemplate jdbc;

    public record Entry(Extra extra, UUID tutorId, TutorIdentityType tutorIdentityType, UUID proposedBy,
                        UUID decisionBy, String reason, String evidence) {
        public Audit audit() {
            return new Audit(extra, proposedBy, tutorIdentityType, decisionBy, reason, evidence);
        }
    }

    private static final RowMapper<Entry> ENTRY = (rs, row) -> {
        String channel = rs.getString("channel");
        var extra = new Extra(rs.getObject("id", UUID.class), rs.getObject("booking_id", UUID.class),
                rs.getObject("partner_id", UUID.class), rs.getInt("version"), rs.getString("description"),
                rs.getInt("quantity"), rs.getLong("unit_price_cents"), rs.getLong("amount_cents"),
                Status.valueOf(rs.getString("status")), instant(rs, "created_at"), instant(rs, "decision_at"),
                channel == null ? null : Channel.valueOf(channel));
        return new Entry(extra, rs.getObject("tutor_id", UUID.class),
                TutorIdentityType.valueOf(rs.getString("tutor_source")), rs.getObject("proposed_by", UUID.class),
                rs.getObject("decision_by", UUID.class), rs.getString("decision_reason"), rs.getString("decision_evidence"));
    };

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    public Page<Entry> list(UUID bookingId, Pageable pageable) {
        var rows = jdbc.query("""
                SELECT * FROM booking_extras WHERE booking_id = ?
                ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
                """, ENTRY, bookingId, pageable.getPageSize(), pageable.getOffset());
        long count = jdbc.queryForObject("SELECT count(*) FROM booking_extras WHERE booking_id = ?", Long.class, bookingId);
        return new PageImpl<>(rows, pageable, count);
    }

    public Optional<Entry> find(UUID bookingId, UUID extraId) {
        return jdbc.query("SELECT * FROM booking_extras WHERE booking_id = ? AND id = ?", ENTRY, bookingId, extraId)
                .stream().findFirst();
    }

    public Optional<Entry> findRequest(UUID bookingId, UUID actorId, String key) {
        return jdbc.query("""
                SELECT * FROM booking_extras WHERE booking_id = ? AND proposed_by = ? AND request_key = ?
                """, ENTRY, bookingId, actorId, key).stream().findFirst();
    }

    public Extra insert(Booking booking, UUID actorId, String key, Proposal proposal) {
        UUID tutorId = booking.getUserId();
        TutorIdentityType source = tutorId == null ? TutorIdentityType.RECEPTION_CUSTOMER : TutorIdentityType.AUTH_USER;
        return jdbc.queryForObject("""
                INSERT INTO booking_extras (id, booking_id, partner_id, tutor_id, tutor_source, version,
                    description, quantity, unit_price_cents, status, proposed_by, request_key, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 'PENDING', ?, ?, clock_timestamp()) RETURNING *
                """, ENTRY, UUID.randomUUID(), booking.getId(), booking.getPartnerId(),
                tutorId == null ? booking.getReceptionCustomerId() : tutorId, source.name(),
                proposal.description(), proposal.quantity(), proposal.unitPriceCents(), actorId, key).extra();
    }

    public Extra decide(UUID bookingId, UUID extraId, Status status, UUID actorId, Channel channel,
                        String reason, String evidence) {
        return jdbc.queryForObject("""
                UPDATE booking_extras SET status = ?, decision_at = clock_timestamp(), decision_by = ?, channel = ?,
                    decision_reason = ?, decision_evidence = ?
                WHERE booking_id = ? AND id = ? AND status = 'PENDING' RETURNING *
                """, ENTRY, status.name(), actorId, channel.name(), reason, evidence, bookingId, extraId).extra();
    }

    public void expirePending(UUID bookingId) {
        jdbc.update("UPDATE booking_extras SET status = 'EXPIRED' WHERE booking_id = ? AND status = 'PENDING'", bookingId);
    }

    public boolean hasExtras(UUID bookingId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM booking_extras WHERE booking_id = ?)", Boolean.class, bookingId));
    }
}
