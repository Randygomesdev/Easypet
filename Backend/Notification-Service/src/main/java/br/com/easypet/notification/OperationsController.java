package br.com.easypet.notification;

import static br.com.easypet.notification.OperationsItem.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
class OperationsController {
    private final AuthClient auth;
    private final OperationsInbox inbox;
    private final String token;

    OperationsController(AuthClient auth, OperationsInbox inbox,
            @Value("${notification.operations-token}") String token) {
        this.auth = auth;
        this.inbox = inbox;
        this.token = token;
    }

    @PostMapping("/support/tickets")
    ResponseEntity<Ticket> create(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @RequestHeader("Idempotency-Key") UUID key, @RequestBody TicketRequest input) {
        var item = inbox.createTicket(auth.requireSession(bearer).userId(), key, input, bearer);
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(item);
    }

    @GetMapping("/support/tickets")
    ResponseEntity<Page<Ticket>> tickets(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ok(inbox.listTickets(auth.requireSession(bearer).userId(), page, size));
    }

    @GetMapping("/support/tickets/{id}")
    ResponseEntity<Ticket> ticket(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @PathVariable UUID id) {
        return ok(inbox.getTicket(id, auth.requireSession(bearer).userId()));
    }

    @GetMapping("/admin/operations/inbox")
    ResponseEntity<Page<OperationsItem>> items(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @RequestParam(required = false) Kind kind, @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        auth.requireAdmin(bearer);
        return ok(inbox.list(null, kind, status, page, size));
    }

    record Unread(long count) {}
    record Resolution(String resolutionMessage) {}

    @GetMapping("/admin/operations/inbox/unread")
    ResponseEntity<Unread> unread(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer) {
        auth.requireAdmin(bearer);
        return ok(new Unread(inbox.unread()));
    }

    @PostMapping("/admin/operations/inbox/{id}/{operation:read|acknowledge|resolve}")
    ResponseEntity<Void> transition(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @PathVariable UUID id, @PathVariable String operation, @RequestBody(required = false) Resolution body) {
        UUID actor = auth.requireAdmin(bearer);
        Action action = Action.valueOf(operation.toUpperCase(java.util.Locale.ROOT));
        if (action != Action.RESOLVE && body != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A operação não recebe resposta textual.");
        }
        inbox.act(id, actor, action, body == null ? null : body.resolutionMessage());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @PostMapping("/internal/operations/alerts")
    ResponseEntity<Void> alert(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @RequestBody AlertRequest input) {
        if (token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Ingresso operacional indisponível.");
        }
        if (bearer == null || !MessageDigest.isEqual(("Bearer " + token).getBytes(StandardCharsets.UTF_8),
                bearer.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial operacional inválida.");
        }
        inbox.ingest(input);
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).build();
    }

    private static <T> ResponseEntity<T> ok(T value) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
    }
}
