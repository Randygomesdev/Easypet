package br.com.easypet.notification;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

record OperationsItem(UUID id, Kind kind, Severity severity, Status status, Source source, String code,
        Service service, UUID incidentId, Long signalSequence, SignalState signalState,
        UUID correlationId, UUID bookingId, String subject, String message, UUID requesterId, Instant createdAt,
        Instant updatedAt, Instant readAt, UUID readBy, Instant acknowledgedAt, UUID acknowledgedBy,
        Instant resolvedAt, UUID resolvedBy, ResolutionOrigin resolutionOrigin, String resolutionMessage) {
    enum Kind { ALERT, TICKET }
    enum Severity { INFO, WARNING, ERROR }
    enum Status { OPEN, ACKNOWLEDGED, RESOLVED }
    enum Source { BACKUP, NOTIFICATION, INFRA }
    enum Service { BACKUP, NOTIFICATION, AUTH, BOOKING, PARTNER, PET, PAYMENT, GATEWAY, FRONTEND, INFRA }
    enum SignalState { OPEN, RECOVERED }
    enum ResolutionOrigin { ADMIN, SYSTEM }
    enum Action { READ, ACKNOWLEDGE, RESOLVE }

    record TicketRequest(String subject, String message, UUID bookingId) {}

    record AlertRequest(UUID incidentId, long sequence, SignalState state, Source source, Service service,
            String code, Severity severity, UUID correlationId) {
        private static final Map<Source, Set<String>> CODES = Map.of(
                Source.BACKUP, Set.of("BACKUP_FAILED", "RESTORE_FAILED"),
                Source.NOTIFICATION, Set.of("QUEUE_DELAY", "DELIVERY_FAILED", "DELIVERY_UNKNOWN"),
                Source.INFRA, Set.of("SERVICE_UNAVAILABLE", "RELEASE_CHECK_FAILED"));

        boolean valid() {
            return incidentId != null && sequence > 0 && state != null && source != null && service != null
                    && (source == Source.INFRA || source.name().equals(service.name())) && code != null && severity != null
                    && CODES.get(source).contains(code);
        }
    }

    record Ticket(UUID id, UUID bookingId, String subject, String message, Status status, Instant createdAt,
            Instant updatedAt, String resolutionMessage, Instant resolvedAt, UUID resolvedBy) {
        static Ticket from(OperationsItem item) {
            return new Ticket(item.id(), item.bookingId(), item.subject(), item.message(), item.status(),
                    item.createdAt(), item.updatedAt(), item.resolutionMessage(), item.resolvedAt(), item.resolvedBy());
        }
    }

    record Page<T>(List<T> content, int page, int size, long totalElements, long totalPages) {}
}
