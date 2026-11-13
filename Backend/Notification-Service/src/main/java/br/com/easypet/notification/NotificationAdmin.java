package br.com.easypet.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class NotificationAdmin {
    private final NotificationStore store;
    private final Clock clock;

    NotificationAdmin(NotificationStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }

    record Page(List<Delivery.View> content, int page, int size, long totalElements, long totalPages) {}

    Page list(UUID bookingId, int page, int size) {
        long total = store.count(bookingId);
        Instant now = clock.instant();
        return new Page(store.list(bookingId, page, size).stream().map(item -> Delivery.View.of(item, now)).toList(),
                page, size, total, (total + size - 1) / size);
    }

    List<Delivery.Attempt> attempts(UUID id) {
        get(id);
        return store.attempts(id);
    }

    @Transactional
    public void retry(UUID id, UUID key, UUID actor) {
        var booking = store.lockBooking(get(id).bookingId());
        var previousActor = store.retryActor(id, key);
        if (previousActor.isPresent()) {
            if (!previousActor.get().equals(actor)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Chave de reenvio já utilizada.");
            }
            return;
        }
        Delivery delivery = get(id);
        Instant now = clock.instant();
        if (!delivery.canRetry(now) || !store.isCurrent(delivery, booking)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O reenvio não está disponível para esta entrega.");
        }
        store.retry(id, key, actor, now);
    }

    private Delivery get(UUID id) {
        return store.find(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."));
    }
}
