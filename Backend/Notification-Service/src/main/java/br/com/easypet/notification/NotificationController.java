package br.com.easypet.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/admin/notifications")
class NotificationController {
    private final AuthClient auth;
    private final NotificationAdmin admin;

    NotificationController(AuthClient auth, NotificationAdmin admin) {
        this.auth = auth;
        this.admin = admin;
    }

    @GetMapping
    ResponseEntity<NotificationAdmin.Page> list(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam UUID bookingId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        auth.requireAdmin(authorization);
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida.");
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(admin.list(bookingId, page, size));
    }

    @GetMapping("/{id}/attempts")
    ResponseEntity<List<Delivery.Attempt>> attempts(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable UUID id
    ) {
        auth.requireAdmin(authorization);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(admin.attempts(id));
    }

    @PostMapping("/{id}/retry")
    ResponseEntity<Void> retry(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader("Idempotency-Key") UUID key, @PathVariable UUID id
    ) {
        UUID actor = auth.requireAdmin(authorization);
        admin.retry(id, key, actor);
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).build();
    }
}
