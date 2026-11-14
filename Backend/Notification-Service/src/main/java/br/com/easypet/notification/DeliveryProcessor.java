package br.com.easypet.notification;

import static br.com.easypet.notification.Delivery.Outcome;
import static br.com.easypet.notification.Delivery.Status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

@Service
class DeliveryProcessor {
    static final Duration ABANDONED_AFTER = Duration.ofMinutes(2);
    private static final int MAX_ATTEMPTS = 3;

    private final NotificationStore store;
    private final EmailTransport transport;
    private final Clock clock;
    private final NotificationPreferences preferences;
    private final ReceptionRecipientClient reception;

    record Claim(NotificationStore.Candidate candidate, int attemptNumber) {}

    DeliveryProcessor(NotificationStore store, EmailTransport transport, Clock clock,
            NotificationPreferences preferences, ReceptionRecipientClient reception) {
        this.store = store;
        this.transport = transport;
        this.clock = clock;
        this.preferences = preferences;
        this.reception = reception;
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

        var result = send(delivery, booking);
        now = clock.instant();
        Status status = switch (result.outcome()) {
            case SENT -> Status.SENT;
            case TRANSIENT_FAILURE -> delivery.cycleAttemptCount() < MAX_ATTEMPTS
                    ? Status.RETRY_SCHEDULED : Status.FAILED;
            case PERMANENT_FAILURE -> Status.FAILED;
            case UNKNOWN -> Status.UNKNOWN;
            case SUPPRESSED -> Status.SUPPRESSED;
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

    private EmailTransport.Result send(Delivery delivery, NotificationStore.Booking booking) {
        var message = EmailMessage.forDelivery(delivery, booking.userId());
        if (booking.userId() != null) {
            return preferences.lockBookingEmail(booking.userId())
                    ? transport.send(message) : suppressed("BOOKING_EMAIL_DISABLED");
        }
        if (booking.receptionCustomerId() == null || !reception.enabled()) {
            return suppressed("RECEPTION_AUTHORIZATION_UNAVAILABLE");
        }
        ReceptionRecipientClient.Recipient recipient;
        try {
            recipient = reception.resolve(booking.partnerId(), booking.receptionCustomerId());
        } catch (RestClientException exception) {
            return new EmailTransport.Result(Outcome.TRANSIENT_FAILURE, "RECIPIENT_LOOKUP_UNAVAILABLE");
        }
        var context = store.receptionDelivery(delivery.id());
        if (recipient == null || context.occurredAt() == null || context.occurredAt().isBefore(recipient.grantedAt())) {
            return suppressed("RECEPTION_AUTHORIZATION_UNAVAILABLE");
        }
        if (context.authorizationId() != null && !context.authorizationId().equals(recipient.authorizationId())) {
            return suppressed("RECEPTION_AUTHORIZATION_CHANGED");
        }
        if (context.authorizationId() == null) {
            store.bindReceptionAuthorization(delivery.id(), recipient.authorizationId());
        }
        return transport.send(message.forAuthorizedReception(recipient.email()));
    }

    private static EmailTransport.Result suppressed(String code) {
        return new EmailTransport.Result(Outcome.SUPPRESSED, code);
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
