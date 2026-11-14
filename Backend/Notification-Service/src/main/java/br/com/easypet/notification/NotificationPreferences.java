package br.com.easypet.notification;

import java.time.Clock;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
class NotificationPreferences {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    NotificationPreferences(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    boolean bookingEmail(UUID actor) {
        return jdbc.query("SELECT booking_email FROM notification_preference WHERE user_id = ?",
                (rs, row) -> rs.getBoolean(1), actor).stream().findFirst().orElse(true);
    }

    boolean lockBookingEmail(UUID actor) {
        ensure(actor, true);
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT booking_email FROM notification_preference WHERE user_id = ? FOR UPDATE
                """, Boolean.class, actor));
    }

    @Transactional
    public void change(UUID actor, boolean enabled) {
        ensure(actor, enabled);
        var now = NotificationStore.timestamp(clock.instant());
        jdbc.update("""
                UPDATE notification_preference SET booking_email = ?, updated_at = ?
                WHERE user_id = ? AND booking_email <> ?
                """, enabled, now, actor, enabled);
    }

    private void ensure(UUID actor, boolean enabled) {
        jdbc.update("""
                INSERT INTO notification_preference (user_id, booking_email, updated_at) VALUES (?, ?, ?)
                ON CONFLICT DO NOTHING
                """, actor, enabled, NotificationStore.timestamp(clock.instant()));
    }
}
