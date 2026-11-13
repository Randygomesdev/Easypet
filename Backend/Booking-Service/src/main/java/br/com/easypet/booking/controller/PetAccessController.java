package br.com.easypet.booking.controller;

import br.com.easypet.booking.service.BookingService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Hidden
@RestController
@RequiredArgsConstructor
public class PetAccessController {

    private final BookingService bookingService;

    @GetMapping("/internal/pets/{petId}/access")
    public boolean hasPetAccess(
            @PathVariable("petId") UUID petId, @RequestParam("ownerId") UUID ownerId
    ) {
        return bookingService.hasPetAccess(petId, ownerId);
    }
}
