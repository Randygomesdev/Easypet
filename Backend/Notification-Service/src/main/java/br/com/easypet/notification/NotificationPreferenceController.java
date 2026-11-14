package br.com.easypet.notification;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/notifications/preferences")
class NotificationPreferenceController {
    private final AuthClient auth;
    private final NotificationPreferences preferences;

    NotificationPreferenceController(AuthClient auth, NotificationPreferences preferences) {
        this.auth = auth;
        this.preferences = preferences;
    }

    record Preference(Boolean bookingEmail) {}

    @GetMapping
    ResponseEntity<Preference> get(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer) {
        return result(preferences.bookingEmail(auth.requireRole(bearer, "CUSTOMER")));
    }

    @PutMapping
    ResponseEntity<Preference> change(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearer,
            @RequestBody Preference input) {
        var actor = auth.requireRole(bearer, "CUSTOMER");
        if (input.bookingEmail() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a preferência de e-mail.");
        }
        preferences.change(actor, input.bookingEmail());
        return result(input.bookingEmail());
    }

    private static ResponseEntity<Preference> result(boolean enabled) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Preference(enabled));
    }
}
