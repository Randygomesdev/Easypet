package br.com.easypet.booking.controller;

import br.com.easypet.booking.dto.response.BookingEvent;
import br.com.easypet.booking.repository.BookingAgendaStore;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/booking-events")
@Validated
public class BookingOutboxController {
    private final BookingAgendaStore agenda;

    public BookingOutboxController(BookingAgendaStore agenda) {
        this.agenda = agenda;
    }

    @GetMapping
    public ResponseEntity<List<BookingEvent>> pending(@RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(agenda.pendingEvents(limit));
    }

    @PostMapping("/{eventId}/ack")
    public ResponseEntity<Void> acknowledge(@PathVariable UUID eventId) {
        agenda.acknowledge(eventId);
        return ResponseEntity.noContent().build();
    }
}
