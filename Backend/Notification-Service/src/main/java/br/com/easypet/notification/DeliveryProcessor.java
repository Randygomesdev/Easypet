package br.com.easypet.notification;

import static br.com.easypet.notification.Delivery.Outcome;
import static br.com.easypet.notification.Delivery.Status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DeliveryProcessor {
    static final Duration ABANDONED_AFTER = Duration.ofMinutes(2);
    private static final int MAX_ATTEMPTS = 3;

    private final NotificationStore store;
    private final EmailTransport transport;
    private final Clock clock;

    record Claim(NotificationStore.Candidate candidate, int attemptNumber) {}

    DeliveryProcessor(NotificationStore store, EmailTransport transport, Clock clock) {
        this.store = store;
        this.transport = transport;
        this.clock = clock;
    }

    @Transactional
    public Optional<Claim> start(NotificationStore.Candidate candidate) {
        var booking = store.lockBooking(candidate.bookingId());
        Delivery delivery = store.find(candidate.id()).orElseThrow();
        Instant now = clock.instant();

        if ((delivery.status() != Status.PENDING && delivery.status() != Status.RETRY_SCHEDULED)
                || delivery.dueAt().isAfter(now)) {
            return Optional.empty();
        }
        if (delivery.expired(now) || !store.isCurrent(delivery, booking)) {
            store.supersede(delivery, now);
            return Optional.empty();
        }
        store.start(delivery, now);
        return Optional.of(new Claim(candidate, delivery.attemptCount() + 1));
    }

    @Transactional(timeout = 30)
    public void deliver(Claim claim) {
        var candidate = claim.candidate();
        // Serialize the final freshness check and handoff with updates to the booking projection.
        var booking = store.lockBooking(candidate.bookingId());
        Delivery delivery = store.find(candidate.id()).orElseThrow();
        if (delivery.status() != Status.SENDING || delivery.attemptCount() != claim.attemptNumber()) {
            return;
        }

        Instant now = clock.instant();
        if (recoverIfAbandoned(delivery, now)) {
            return;
        }
        if (delivery.expired(now) || !store.isCurrent(delivery, booking)) {
            store.finish(delivery, Status.SUPERSEDED, Outcome.SUPERSEDED, now, delivery.dueAt(), null);
            return;
        }

        var result = transport.send(EmailMessage.forDelivery(delivery, booking.userId()));
        now = clock.instant();
        Status status = switch (result.outcome()) {
            case SENT -> Status.SENT;
            case TRANSIENT_FAILURE -> delivery.cycleAttemptCount() < MAX_ATTEMPTS
                    ? Status.RETRY_SCHEDULED : Status.FAILED;
            case PERMANENT_FAILURE -> Status.FAILED;
            case UNKNOWN -> Status.UNKNOWN;
            case STARTED, SUPERSEDED -> throw new IllegalStateException("Resultado inválido do transporte");
        };
        Instant due = delivery.dueAt();
        if (status == Status.RETRY_SCHEDULED) {
            due = now.plus(Duration.ofMinutes(delivery.cycleAttemptCount()));
            if (delivery.expired(due)) {
                status = Status.SUPERSEDED;
            }
        }
        store.finish(delivery, status, result.outcome(), now, due, result.error());
    }

    @Transactional
    public void recover(NotificationStore.Candidate candidate) {
        store.lockBooking(candidate.bookingId());
        Delivery delivery = store.find(candidate.id()).orElseThrow();
        recoverIfAbandoned(delivery, clock.instant());
    }

    private boolean recoverIfAbandoned(Delivery delivery, Instant now) {
        if (delivery.status() != Status.SENDING || delivery.updatedAt().plus(ABANDONED_AFTER).isAfter(now)) {
            return false;
        }
        store.finish(delivery, Status.UNKNOWN, Outcome.UNKNOWN, now, delivery.dueAt(), "ATTEMPT_INTERRUPTED");
        return true;
    }
}
