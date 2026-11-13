package br.com.easypet.notification;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

record Delivery(
        UUID id, UUID bookingId, Type type, Status status, LocalDateTime bookingDate,
        Instant expiresAt, Instant dueAt, Instant updatedAt, int attemptCount, int cycleAttemptCount,
        String lastError
) {
    enum Type { CONFIRMATION, RESCHEDULED, CANCELLED, REMINDER, READY }

    enum Status { PENDING, SENDING, RETRY_SCHEDULED, SENT, FAILED, SUPERSEDED, UNKNOWN }

    enum Outcome { STARTED, SENT, TRANSIENT_FAILURE, PERMANENT_FAILURE, UNKNOWN, SUPERSEDED }

    record Attempt(int number, Instant startedAt, Instant finishedAt, Outcome outcome, String error) {}

    record View(
            UUID id, UUID bookingId, Type type, Status status, int attemptCount,
            Instant dueAt, Instant updatedAt, String lastError, boolean canRetry
    ) {
        static View of(Delivery delivery, Instant now) {
            return new View(delivery.id(), delivery.bookingId(), delivery.type(), delivery.status(),
                    delivery.attemptCount(), delivery.dueAt(), delivery.updatedAt(),
                    delivery.lastError(), delivery.canRetry(now));
        }
    }

    boolean canRetry(Instant now) {
        return status == Status.FAILED && !"RECIPIENT_DOMAIN_BLOCKED".equals(lastError) && !expired(now);
    }

    boolean expired(Instant now) {
        return expiresAt != null && !now.isBefore(expiresAt);
    }
}
