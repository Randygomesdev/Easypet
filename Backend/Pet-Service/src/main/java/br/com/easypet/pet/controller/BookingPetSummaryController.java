package br.com.easypet.pet.controller;

import br.com.easypet.pet.domain.model.PetSpecies;
import br.com.easypet.pet.client.CustomerMembershipClient;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.repository.PetRepository;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Hidden
@RestController
@RequestMapping("/internal/pets")
public class BookingPetSummaryController {
    private final PetRepository pets;
    private final CustomerMembershipClient memberships;
    private final byte[] expectedAuthorization;

    public BookingPetSummaryController(PetRepository pets, CustomerMembershipClient memberships,
            @Value("${BOOKING_PET_SUMMARY_TOKEN:}") String secret) {
        this.pets = pets;
        this.memberships = memberships;
        this.expectedAuthorization = secret.isBlank() ? null : ("Bearer " + secret).getBytes(StandardCharsets.UTF_8);
    }

    @GetMapping("/{petId}/booking-summary")
    public PetSummary summary(@PathVariable UUID petId,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(required = false) UUID ownerId, @RequestParam(required = false) UUID receptionCustomerId,
            @RequestParam(required = false) UUID partnerId) {
        if (expectedAuthorization == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Consulta de pet da agenda indisponível.");
        }
        if (authorization == null
                || !MessageDigest.isEqual(expectedAuthorization, authorization.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial de serviço inválida.");
        }
        boolean ownerSource = ownerId != null && receptionCustomerId == null && partnerId == null;
        boolean deskSource = ownerId == null && receptionCustomerId != null && partnerId != null;
        if (!ownerSource && !deskSource) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origem do pet inválida.");
        }
        return pets.findById(petId)
                .filter(pet -> ownerSource
                        ? ownerId.equals(pet.getOwnerId())
                                || (pet.getOwnerId() == null && pet.getReceptionCustomerId() != null
                                    && memberships.isClaimOwner(pet.getReceptionPartnerId(), pet.getReceptionCustomerId(), ownerId))
                        : receptionCustomerId.equals(pet.getReceptionCustomerId())
                                && partnerId.equals(pet.getReceptionPartnerId()))
                .map(pet -> new PetSummary(pet.getId(), pet.getName(), pet.getSpecies()))
                .orElseThrow(() -> new ResourceNotFoundException("Pet não disponível para esta reserva."));
    }

    public record PetSummary(UUID id, String name, PetSpecies species) {}
}
