package br.com.easypet.payment.cashier;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static br.com.easypet.payment.cashier.CashierModels.*;

@Repository
class CashierRepository {
    private static final String CHARGE_SELECT = """
            SELECT c.*, c.base_cents + c.extras_cents - c.discount_cents AS total,
                   COALESCE(m.received, 0) AS received
            FROM cashier_charges c
            LEFT JOIN LATERAL (
                SELECT SUM(amount_cents) AS received FROM cashier_movements
                WHERE partner_id = c.partner_id AND charge_id = c.id
            ) m ON true
            WHERE c.partner_id = :partner
            """;
    private static final String MOVEMENT_SELECT = """
            SELECT m.*, c.description FROM cashier_movements m
            JOIN cashier_charges c ON c.partner_id = m.partner_id AND c.id = m.charge_id
            WHERE m.partner_id = :partner
            """;
    private static final RowMapper<Charge> CHARGE_MAPPER = (row, index) -> new Charge(
            row.getObject("id", UUID.class), row.getObject("booking_id", UUID.class), row.getString("description"),
            row.getLong("base_cents"), row.getLong("extras_cents"), row.getLong("discount_cents"),
            row.getLong("total"), row.getLong("received"), row.getLong("total") - row.getLong("received"),
            row.getObject("created_at", OffsetDateTime.class), row.getObject("created_by", UUID.class));
    private static final RowMapper<Movement> MOVEMENT_MAPPER = (row, index) -> new Movement(
            row.getObject("id", UUID.class), row.getObject("charge_id", UUID.class), row.getString("description"),
            row.getObject("business_date", LocalDate.class), MovementType.valueOf(row.getString("type")),
            Method.valueOf(row.getString("method")), row.getLong("amount_cents"), row.getString("reason"),
            row.getObject("reverses_receipt_id", UUID.class), row.getObject("created_at", OffsetDateTime.class),
            row.getObject("created_by", UUID.class));

    private final JdbcClient jdbc;

    CashierRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    void lockRegister(UUID partnerId) {
        jdbc.sql("INSERT INTO cashier_registers (partner_id) VALUES (:partner) ON CONFLICT DO NOTHING")
                .param("partner", partnerId).update();
        jdbc.sql("SELECT partner_id FROM cashier_registers WHERE partner_id = :partner FOR UPDATE")
                .param("partner", partnerId).query(UUID.class).single();
    }

    Optional<Command> command(UUID partnerId, UUID key) {
        return jdbc.sql("""
                SELECT actor_id, fingerprint, result_id FROM cashier_commands
                WHERE partner_id = :partner AND idempotency_key = :key
                """).param("partner", partnerId).param("key", key)
                .query((row, index) -> new Command(row.getObject("actor_id", UUID.class),
                        row.getBytes("fingerprint"), row.getObject("result_id", UUID.class))).optional();
    }

    void saveCommand(UUID partnerId, UUID key, Command command) {
        jdbc.sql("""
                INSERT INTO cashier_commands (partner_id, idempotency_key, actor_id, fingerprint, result_id)
                VALUES (:partner, :key, :actor, :fingerprint, :result)
                """).param("partner", partnerId).param("key", key).param("actor", command.actorId())
                .param("fingerprint", command.fingerprint()).param("result", command.resultId()).update();
    }

    Page<Charge> charges(UUID partnerId, boolean openOnly, int page, int size) {
        String filter = CHARGE_SELECT + (openOnly
                ? " AND c.base_cents + c.extras_cents - c.discount_cents > COALESCE(m.received, 0)"
                : "");
        long count = jdbc.sql("SELECT COUNT(*) FROM (" + filter + ") charges")
                .param("partner", partnerId).query(Long.class).single();
        List<Charge> content = jdbc.sql(filter + " ORDER BY c.created_at DESC, c.id DESC LIMIT :size OFFSET :offset")
                .param("partner", partnerId).param("size", size).param("offset", (long) page * size)
                .query(CHARGE_MAPPER).list();
        return Page.of(content, page, size, count);
    }

    Optional<Charge> charge(UUID partnerId, UUID chargeId) {
        return jdbc.sql(CHARGE_SELECT + " AND c.id = :charge")
                .param("partner", partnerId).param("charge", chargeId).query(CHARGE_MAPPER).optional();
    }

    boolean hasCharge(UUID partnerId, UUID bookingId) {
        return jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM cashier_charges WHERE partner_id = :partner AND booking_id = :booking)
                """).param("partner", partnerId).param("booking", bookingId).query(Boolean.class).single();
    }

    UUID insertCharge(UUID partnerId, UUID actorId, OffsetDateTime now, UUID bookingId,
                      String description, long base, long extras, long discount) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO cashier_charges
                    (id, partner_id, booking_id, description, base_cents, extras_cents, discount_cents, created_at, created_by)
                VALUES (:id, :partner, :booking, :description, :base, :extras, :discount, :now, :actor)
                """).param("id", id).param("partner", partnerId).param("booking", bookingId)
                .param("description", description).param("base", base).param("extras", extras).param("discount", discount)
                .param("now", now).param("actor", actorId).update();
        return id;
    }

    void insertMovement(UUID partnerId, Movement movement) {
        jdbc.sql("""
                INSERT INTO cashier_movements (id, partner_id, charge_id, business_date, type, method, amount_cents,
                                               reason, reverses_receipt_id, created_at, created_by)
                VALUES (:id, :partner, :charge, :date, :type, :method, :amount, :reason, :original, :now, :actor)
                """).param("id", movement.id()).param("partner", partnerId).param("charge", movement.chargeId())
                .param("date", movement.date()).param("type", movement.type().name()).param("method", movement.method().name())
                .param("amount", movement.amountCents()).param("reason", movement.reason())
                .param("original", movement.reversesReceiptId()).param("now", movement.createdAt())
                .param("actor", movement.createdBy()).update();
    }

    Optional<Movement> receipt(UUID partnerId, UUID receiptId) {
        return jdbc.sql(MOVEMENT_SELECT + " AND m.id = :receipt AND m.type = 'RECEIPT'")
                .param("partner", partnerId).param("receipt", receiptId).query(MOVEMENT_MAPPER).optional();
    }

    boolean hasReversal(UUID partnerId, UUID receiptId) {
        return jdbc.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM cashier_movements WHERE partner_id = :partner AND reverses_receipt_id = :receipt
                )
                """).param("partner", partnerId).param("receipt", receiptId).query(Boolean.class).single();
    }

    List<Movement> chargeMovements(UUID partnerId, UUID chargeId) {
        return jdbc.sql(MOVEMENT_SELECT + " AND m.charge_id = :charge ORDER BY m.created_at DESC, m.id DESC")
                .param("partner", partnerId).param("charge", chargeId).query(MOVEMENT_MAPPER).list();
    }

    Page<Movement> dayMovements(UUID partnerId, LocalDate date, int page, int size) {
        long count = jdbc.sql("""
                SELECT COUNT(*) FROM cashier_movements WHERE partner_id = :partner AND business_date = :date
                """).param("partner", partnerId).param("date", date).query(Long.class).single();
        List<Movement> content = jdbc.sql(MOVEMENT_SELECT + """
                 AND m.business_date = :date ORDER BY m.created_at DESC, m.id DESC LIMIT :size OFFSET :offset
                """).param("partner", partnerId).param("date", date).param("size", size)
                .param("offset", (long) page * size).query(MOVEMENT_MAPPER).list();
        return Page.of(content, page, size, count);
    }

    Totals totals(UUID partnerId, LocalDate date) {
        record MethodTotals(Method method, long received, long adjustments) {}
        List<MethodTotals> rows = jdbc.sql("""
                SELECT method, COALESCE(SUM(amount_cents) FILTER (WHERE type = 'RECEIPT'), 0) AS received,
                       COALESCE(SUM(amount_cents) FILTER (WHERE type = 'REVERSAL'), 0) AS adjustments
                FROM cashier_movements WHERE partner_id = :partner AND business_date = :date GROUP BY method
                """).param("partner", partnerId).param("date", date)
                .query((row, index) -> new MethodTotals(Method.valueOf(row.getString("method")),
                        row.getLong("received"), row.getLong("adjustments"))).list();
        var byMethod = new EnumMap<Method, Long>(Method.class);
        for (Method method : Method.values()) {
            byMethod.put(method, 0L);
        }
        long received = 0;
        long adjustments = 0;
        for (MethodTotals row : rows) {
            received = Math.addExact(received, row.received());
            adjustments = Math.addExact(adjustments, row.adjustments());
            byMethod.put(row.method(), Math.addExact(row.received(), row.adjustments()));
        }
        return new Totals(received, adjustments, Math.addExact(received, adjustments), byMethod);
    }

    Optional<Closing> closing(UUID partnerId, LocalDate date) {
        return jdbc.sql("""
                SELECT id, closed_at, closed_by FROM cashier_closings
                WHERE partner_id = :partner AND business_date = :date
                """).param("partner", partnerId).param("date", date)
                .query((row, index) -> new Closing(row.getObject("id", UUID.class),
                        row.getObject("closed_at", OffsetDateTime.class), row.getObject("closed_by", UUID.class))).optional();
    }

    UUID insertClosing(UUID partnerId, LocalDate date, OffsetDateTime now, UUID actorId) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO cashier_closings (id, partner_id, business_date, closed_at, closed_by)
                VALUES (:id, :partner, :date, :now, :actor)
                """).param("id", id).param("partner", partnerId).param("date", date)
                .param("now", now).param("actor", actorId).update();
        return id;
    }

    record Command(UUID actorId, byte[] fingerprint, UUID resultId) {}

    record Closing(UUID id, OffsetDateTime closedAt, UUID closedBy) {}
}
