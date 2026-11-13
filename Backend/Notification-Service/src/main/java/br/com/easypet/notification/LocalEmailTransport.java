package br.com.easypet.notification;

import java.time.Clock;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "notification.transport", havingValue = "LOCAL", matchIfMissing = true)
class LocalEmailTransport implements EmailTransport {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    LocalEmailTransport(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public Result send(EmailMessage message) {
        jdbc.update("""
                INSERT INTO notification_local_mail (delivery_id, recipient, subject, body, accepted_at)
                VALUES (?, 'notifications@example.test', ?, ?, ?)
                ON CONFLICT DO NOTHING
                """, message.deliveryId(), message.subject(), message.body(), NotificationStore.timestamp(clock.instant()));
        return new Result(Delivery.Outcome.SENT, null);
    }
}
