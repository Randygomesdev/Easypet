package br.com.easypet.booking.controller;

import br.com.easypet.booking.dto.BookingExtras.*;
import br.com.easypet.booking.service.BookingExtraService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class BookingExtraController {
    private final BookingExtraService extras;

    @GetMapping("/bookings/{bookingId}/extras")
    public Page<Extra> list(@PathVariable UUID bookingId,
                            @RequestParam(defaultValue = "0") @Min(0) int page,
                            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return extras.list(bookingId, PageRequest.of(page, size));
    }

    @PostMapping("/bookings/{bookingId}/extras")
    @ResponseStatus(HttpStatus.CREATED)
    public Extra propose(@PathVariable UUID bookingId, @RequestHeader("Idempotency-Key") String key,
                         @Valid @RequestBody Proposal proposal) {
        return extras.propose(bookingId, key, proposal);
    }

    @PostMapping("/bookings/{bookingId}/extras/{extraId}/decisions/digital")
    public Extra decideDigital(@PathVariable UUID bookingId, @PathVariable UUID extraId,
                               @Valid @RequestBody DigitalDecision decision) {
        return extras.decideDigital(bookingId, extraId, decision);
    }

    @PostMapping("/bookings/{bookingId}/extras/{extraId}/decisions/in-person")
    public Extra decideInPerson(@PathVariable UUID bookingId, @PathVariable UUID extraId,
                                @Valid @RequestBody InPersonDecision decision) {
        return extras.decideInPerson(bookingId, extraId, decision);
    }

    @Hidden
    @GetMapping("/internal/booking-extra-authorizations/{authorizationId}")
    public PaymentAuthorization paymentAuthorization(@PathVariable UUID authorizationId, @RequestParam UUID partnerId,
                                                     @RequestParam UUID bookingId, @RequestParam @Min(1) int version) {
        return extras.paymentAuthorization(partnerId, bookingId, authorizationId, version);
    }
}
