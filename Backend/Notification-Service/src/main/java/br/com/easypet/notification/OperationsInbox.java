package br.com.easypet.notification;

import static br.com.easypet.notification.OperationsItem.*;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class OperationsInbox {
    private final OperationsStore store;
    private final BookingAccessClient booking;
    private final Clock clock;

    OperationsInbox(OperationsStore store, BookingAccessClient booking, Clock clock) {
        this.store = store;
        this.booking = booking;
        this.clock = clock;
    }

    public Ticket createTicket(UUID actor, UUID key, TicketRequest input, String bearer) {
        String scope = "TICKET:" + actor;
        String subject = bounded(input.subject(), 120);
        String message = bounded(input.message(), 2000);
        var previous = store.findByKey(scope, key);
        if (previous.isPresent()) {
            return verifyTicket(previous.get(), input.bookingId(), subject, message);
        }
        if (input.bookingId() != null) {
            booking.requireRead(input.bookingId(), bearer);
        }
        Instant now = clock.instant();
        var item = new OperationsItem(UUID.randomUUID(), Kind.TICKET, Severity.INFO, Status.OPEN, null, null,
                null, null, null, null, null, input.bookingId(), subject, message, actor, now, now,
                null, null, null, null, null, null, null, null);
        store.insert(scope, key, item);
        return verifyTicket(store.findByKey(scope, key).orElseThrow(), input.bookingId(), subject, message);
    }

    private static Ticket verifyTicket(OperationsItem saved, UUID bookingId, String subject, String message) {
        if (!Objects.equals(saved.bookingId(), bookingId) || !saved.subject().equals(subject)
                || !saved.message().equals(message)) {
            throw conflict("A chave já foi usada com outro conteúdo.");
        }
        return Ticket.from(saved);
    }

    Ticket getTicket(UUID id, UUID actor) {
        return store.findTicket(id, actor).map(Ticket::from).orElseThrow(OperationsInbox::notFound);
    }

    Page<Ticket> listTickets(UUID actor, int page, int size) {
        var result = list(actor, Kind.TICKET, null, page, size);
        return new Page<>(result.content().stream().map(Ticket::from).toList(), page, size,
                result.totalElements(), result.totalPages());
    }

    Page<OperationsItem> list(UUID actor, Kind kind, Status status, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw invalid("Paginação inválida.");
        }
        return store.list(actor, kind, status, page, size);
    }

    long unread() {
        return store.unread();
    }

    @Transactional
    public void ingest(AlertRequest input) {
        if (!input.valid()) {
            throw invalid("Sinal operacional inválido.");
        }
        Instant now = clock.instant();
        boolean recovered = input.state() == SignalState.RECOVERED;
        String scope = "ALERT:" + input.service();
        var item = new OperationsItem(UUID.randomUUID(), Kind.ALERT, input.severity(),
                recovered ? Status.RESOLVED : Status.OPEN, input.source(), input.code(), input.service(),
                input.incidentId(), input.sequence(), input.state(), input.correlationId(), null, null, null,
                null, now, now, null, null, null, null, recovered ? now : null, null,
                recovered ? ResolutionOrigin.SYSTEM : null, null);
        store.insert(scope, input.incidentId(), item);
        var saved = store.lockByKey(scope, input.incidentId());
        if (saved.source() != input.source() || saved.severity() != input.severity()
                || !saved.code().equals(input.code()) || !Objects.equals(saved.correlationId(), input.correlationId())) {
            throw conflict("Os metadados do incidente são imutáveis.");
        }
        if (input.sequence() < saved.signalSequence()) {
            return;
        }
        if (input.sequence() == saved.signalSequence()) {
            if (saved.signalState() != input.state()) {
                throw conflict("A sequência já tem outro estado registrado.");
            }
            return;
        }
        if (saved.signalState() == SignalState.RECOVERED && input.state() == SignalState.OPEN) {
            throw conflict("Um incidente recuperado exige novo identificador para nova abertura.");
        }
        store.updateSignal(saved.id(), input, now);
    }

    @Transactional
    public void act(UUID id, UUID actor, Action action, String response) {
        var saved = store.lock(id).orElseThrow(OperationsInbox::notFound);
        String resolution = null;
        switch (action) {
            case READ -> {
                if (saved.readAt() != null) return;
            }
            case ACKNOWLEDGE -> {
                if (saved.acknowledgedAt() != null) return;
                if (saved.status() == Status.RESOLVED) throw conflict("O item já foi resolvido.");
            }
            case RESOLVE -> {
                if (saved.kind() == Kind.TICKET) {
                    resolution = bounded(response, 2000);
                } else if (response != null) {
                    throw invalid("Alertas não recebem resposta textual.");
                }
                if (saved.status() == Status.RESOLVED) {
                    if (!Objects.equals(resolution, saved.resolutionMessage())) {
                        throw conflict("O chamado já tem outra resposta.");
                    }
                    if (saved.readAt() == null) {
                        store.apply(id, actor, clock.instant(), Action.READ, null);
                    }
                    return;
                }
            }
        }
        store.apply(id, actor, clock.instant(), action, resolution);
    }

    private static String bounded(String value, int limit) {
        if (value == null || value.isBlank() || value.strip().length() > limit) {
            throw invalid("Preencha os campos de texto dentro do limite.");
        }
        return value.strip();
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Item não encontrado.");
    }
}
