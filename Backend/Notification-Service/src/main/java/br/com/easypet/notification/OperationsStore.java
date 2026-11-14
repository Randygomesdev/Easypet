package br.com.easypet.notification;

import static br.com.easypet.notification.NotificationStore.instant;
import static br.com.easypet.notification.NotificationStore.timestamp;
import static br.com.easypet.notification.NotificationStore.uuid;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class OperationsStore {
    private final NamedParameterJdbcTemplate jdbc;

    OperationsStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    void insert(String scope, UUID key, OperationsItem item) {
        jdbc.update("""
                INSERT INTO operations_inbox (id, kind, severity, status, dedup_scope, event_key, source, code,
                    service, signal_sequence, signal_state, correlation_id, booking_id, subject, message,
                    requester_id, created_at, updated_at, resolved_at, resolution_origin)
                VALUES (:id, :kind, :severity, :status, :scope, :key, :source, :code,
                    :service, :sequence, :signal, :correlation, :booking, :subject, :message,
                    :requester, :now, :now, :resolvedAt, :origin)
                ON CONFLICT DO NOTHING
                """, new MapSqlParameterSource().addValue("id", item.id()).addValue("kind", item.kind().name())
                .addValue("severity", item.severity().name()).addValue("status", item.status().name())
                .addValue("scope", scope).addValue("key", key)
                .addValue("source", item.source() == null ? null : item.source().name()).addValue("code", item.code())
                .addValue("service", item.service() == null ? null : item.service().name())
                .addValue("sequence", item.signalSequence())
                .addValue("signal", item.signalState() == null ? null : item.signalState().name())
                .addValue("resolvedAt", timestamp(item.resolvedAt()))
                .addValue("origin", item.resolutionOrigin() == null ? null : item.resolutionOrigin().name())
                .addValue("correlation", item.correlationId()).addValue("booking", item.bookingId())
                .addValue("subject", item.subject()).addValue("message", item.message())
                .addValue("requester", item.requesterId()).addValue("now", timestamp(item.createdAt())));
    }

    Optional<OperationsItem> findByKey(String scope, UUID key) {
        return jdbc.query("SELECT * FROM operations_inbox WHERE dedup_scope = :scope AND event_key = :key",
                new MapSqlParameterSource("scope", scope).addValue("key", key), this::map).stream().findFirst();
    }

    OperationsItem lockByKey(String scope, UUID key) {
        return jdbc.queryForObject("SELECT * FROM operations_inbox WHERE dedup_scope = :scope AND event_key = :key FOR UPDATE",
                new MapSqlParameterSource("scope", scope).addValue("key", key), this::map);
    }

    void updateSignal(UUID id, OperationsItem.AlertRequest input, Instant now) {
        boolean recovered = input.state() == OperationsItem.SignalState.RECOVERED;
        jdbc.update("""
                UPDATE operations_inbox SET signal_sequence = :sequence, signal_state = :signal, updated_at = :now
                """ + (recovered ? """
                , status = 'RESOLVED', resolved_at = COALESCE(resolved_at, :now),
                resolution_origin = COALESCE(resolution_origin, 'SYSTEM')
                """ : "") + " WHERE id = :id", new MapSqlParameterSource("id", id)
                .addValue("sequence", input.sequence()).addValue("signal", input.state().name())
                .addValue("now", timestamp(now)));
    }

    Optional<OperationsItem> findTicket(UUID id, UUID actor) {
        return jdbc.query("SELECT * FROM operations_inbox WHERE id = :id AND requester_id = :actor",
                new MapSqlParameterSource("id", id).addValue("actor", actor), this::map).stream().findFirst();
    }

    Optional<OperationsItem> lock(UUID id) {
        return jdbc.query("SELECT * FROM operations_inbox WHERE id = :id FOR UPDATE",
                new MapSqlParameterSource("id", id), this::map).stream().findFirst();
    }

    long unread() {
        return jdbc.getJdbcTemplate().queryForObject("SELECT COUNT(*) FROM operations_inbox WHERE read_at IS NULL", Long.class);
    }

    OperationsItem.Page<OperationsItem> list(UUID actor, OperationsItem.Kind kind, OperationsItem.Status status,
            int page, int size) {
        var params = new MapSqlParameterSource().addValue("pageSize", size).addValue("offset", (long) page * size);
        StringBuilder filter = new StringBuilder(" WHERE 1=1");
        if (actor != null) {
            params.addValue("actor", actor);
            filter.append(" AND requester_id = :actor");
        }
        if (kind != null) {
            params.addValue("kind", kind.name());
            filter.append(" AND kind = :kind");
        }
        if (status != null) {
            params.addValue("status", status.name());
            filter.append(" AND status = :status");
        }
        long count = jdbc.queryForObject("SELECT COUNT(*) FROM operations_inbox" + filter, params, Long.class);
        List<OperationsItem> rows = jdbc.query("SELECT * FROM operations_inbox" + filter
                + " ORDER BY created_at DESC, id DESC LIMIT :pageSize OFFSET :offset", params, this::map);
        return new OperationsItem.Page<>(rows, page, size, count, (count + size - 1) / size);
    }

    void apply(UUID id, UUID actor, Instant now, OperationsItem.Action action, String resolution) {
        String change = switch (action) {
            case READ -> "";
            case ACKNOWLEDGE -> ", status = 'ACKNOWLEDGED', acknowledged_at = :now, acknowledged_by = :actor";
            case RESOLVE -> ", status = 'RESOLVED', resolved_at = :now, resolved_by = :actor"
                    + ", resolution_origin = 'ADMIN', resolution_message = :resolution";
        };
        jdbc.update("""
                UPDATE operations_inbox SET updated_at = :now,
                    read_at = COALESCE(read_at, :now), read_by = COALESCE(read_by, :actor)
                """ + change + " WHERE id = :id",
                new MapSqlParameterSource("id", id).addValue("now", timestamp(now)).addValue("actor", actor)
                        .addValue("resolution", resolution));
    }

    private OperationsItem map(ResultSet rs, int row) throws SQLException {
        return new OperationsItem(uuid(rs, "id"), OperationsItem.Kind.valueOf(rs.getString("kind")),
                OperationsItem.Severity.valueOf(rs.getString("severity")), OperationsItem.Status.valueOf(rs.getString("status")),
                enumValue(rs, "source", OperationsItem.Source.class), rs.getString("code"),
                enumValue(rs, "service", OperationsItem.Service.class),
                "ALERT".equals(rs.getString("kind")) ? uuid(rs, "event_key") : null,
                rs.getObject("signal_sequence", Long.class), enumValue(rs, "signal_state", OperationsItem.SignalState.class),
                uuid(rs, "correlation_id"), uuid(rs, "booking_id"), rs.getString("subject"), rs.getString("message"),
                uuid(rs, "requester_id"), instant(rs, "created_at"), instant(rs, "updated_at"),
                instant(rs, "read_at"), uuid(rs, "read_by"), instant(rs, "acknowledged_at"),
                uuid(rs, "acknowledged_by"), instant(rs, "resolved_at"), uuid(rs, "resolved_by"),
                enumValue(rs, "resolution_origin", OperationsItem.ResolutionOrigin.class), rs.getString("resolution_message"));
    }

    private static <E extends Enum<E>> E enumValue(ResultSet rs, String column, Class<E> type) throws SQLException {
        String value = rs.getString(column);
        return value == null ? null : Enum.valueOf(type, value);
    }
}
