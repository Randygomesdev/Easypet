package br.com.easypet.booking.controller;

import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.dto.BookingInvestigation.Detail;
import br.com.easypet.booking.dto.BookingInvestigation.Summary;
import br.com.easypet.booking.service.BookingInvestigationService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/bookings/investigations")
@RequiredArgsConstructor
public class BookingInvestigationController {
    private final BookingInvestigationService investigations;

    @GetMapping
    public Page<Summary> list(@RequestParam(required = false) UUID partnerId,
                              @RequestParam(required = false) UUID bookingId,
                              @RequestParam(required = false) BookingStatus status,
                              @RequestParam(defaultValue = "0") @Min(0) int page,
                              @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return investigations.list(partnerId, bookingId, status,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "bookingDate", "id")));
    }

    @GetMapping("/{bookingId}")
    public Detail detail(@PathVariable UUID bookingId, @RequestParam(required = false) UUID partnerId,
                         @RequestParam(defaultValue = "0") @Min(0) int historyPage,
                         @RequestParam(defaultValue = "20") @Min(1) @Max(100) int historySize,
                         @RequestParam(defaultValue = "0") @Min(0) int extrasPage,
                         @RequestParam(defaultValue = "20") @Min(1) @Max(100) int extrasSize) {
        return investigations.detail(bookingId, partnerId, PageRequest.of(historyPage, historySize),
                PageRequest.of(extrasPage, extrasSize));
    }
}
