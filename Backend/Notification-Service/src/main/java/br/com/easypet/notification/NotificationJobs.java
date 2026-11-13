package br.com.easypet.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
class NotificationJobs {
    private static final Logger LOG = LoggerFactory.getLogger(NotificationJobs.class);
    private static final int BATCH = 50;

    private final RestClient booking;
    private final boolean pollingEnabled;
    private final BookingEventConsumer consumer;
    private final NotificationStore store;
    private final DeliveryProcessor processor;
    private final Clock clock;
    private volatile OutboxCheck outboxCheck;

    enum SyncState { WAITING, UP_TO_DATE, BACKLOG, UNAVAILABLE, DISABLED }
    record OutboxCheck(SyncState state, Instant checkedAt) {}

    NotificationJobs(
            InternalHttp http, @Value("${notification.booking-url}") String bookingUrl,
            @Value("${notification.outbox-token}") String token,
            BookingEventConsumer consumer, NotificationStore store, DeliveryProcessor processor, Clock clock
    ) {
        this.booking = http.client(bookingUrl).defaultHeader("Authorization", "Bearer " + token).build();
        this.pollingEnabled = !token.isBlank();
        this.outboxCheck = new OutboxCheck(pollingEnabled ? SyncState.WAITING : SyncState.DISABLED, null);
        this.consumer = consumer;
        this.store = store;
        this.processor = processor;
        this.clock = clock;
    }

    @Scheduled(initialDelayString = "${notification.poll-delay}", fixedDelayString = "${notification.poll-delay}")
    public void tick() {
        Instant cutoff = clock.instant().minus(DeliveryProcessor.ABANDONED_AFTER);
        for (var candidate : store.abandonedCandidates(cutoff, BATCH)) {
            try {
                processor.recover(candidate);
            } catch (RuntimeException exception) {
                LOG.warn("Falha ao recuperar tentativa de notificação");
            }
        }

        if (!pollingEnabled) {
            return;
        }
        SyncState state = drainOutbox();
        outboxCheck = new OutboxCheck(state, clock.instant());
        if (state != SyncState.UP_TO_DATE) {
            return;
        }
        Instant now = clock.instant();
        for (var candidate : store.dueCandidates(now, BATCH)) {
            try {
                processor.start(candidate).ifPresent(processor::deliver);
            } catch (RuntimeException exception) {
                LOG.warn("Falha ao processar entrega de notificação");
            }
        }
    }

    boolean pollingEnabled() {
        return pollingEnabled;
    }

    OutboxCheck outboxCheck() {
        return outboxCheck;
    }

    private SyncState drainOutbox() {
        try {
            // Confirm an empty poll before dispatch so backlog cannot hide a newer cancellation.
            for (int batch = 0; batch < 4; batch++) {
                List<BookingEvent> events = booking.get().uri("/internal/booking-events?limit={limit}", BATCH)
                        .retrieve().body(new ParameterizedTypeReference<>() {});
                if (events == null) {
                    LOG.warn("Resposta vazia ao consultar o outbox de reservas");
                    return SyncState.UNAVAILABLE;
                }
                if (events.isEmpty()) {
                    return SyncState.UP_TO_DATE;
                }
                for (BookingEvent event : events) {
                    consumer.consume(event);
                    booking.post().uri("/internal/booking-events/{id}/ack", event.eventId())
                            .retrieve().toBodilessEntity();
                }
            }
        } catch (RuntimeException exception) {
            LOG.warn("Falha ao sincronizar o outbox de reservas ({})", exception.getClass().getSimpleName());
            return SyncState.UNAVAILABLE;
        }
        return SyncState.BACKLOG;
    }
}
