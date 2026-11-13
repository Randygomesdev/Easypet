package br.com.easypet.pet.service;

import br.com.easypet.pet.client.BookingAccessClient;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.repository.PetRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PetAccessServiceTest {

    private final PetRepository pets = mock(PetRepository.class);
    private final BookingAccessClient bookings = mock(BookingAccessClient.class);
    private final PetAccessService access = new PetAccessService(pets, bookings);
    private final Pet pet = Pet.builder().id(UUID.randomUUID()).ownerId(UUID.randomUUID()).build();

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void linkedPartnerCanAccessPetButCannotEditItsRegistration() {
        authenticateAs("PARTNER", UUID.randomUUID());
        when(pets.findById(pet.getId())).thenReturn(Optional.of(pet));
        when(bookings.hasPetAccess(pet.getId(), pet.getOwnerId())).thenReturn(true);

        assertSame(pet, access.requireAccess(pet.getId()));
        assertThrows(ResourceNotFoundException.class, () -> access.requireOwnerOrAdmin(pet.getId()));
    }

    @Test
    void partnerWithoutBookingCannotAccessPet() {
        authenticateAs("PARTNER", UUID.randomUUID());
        when(pets.findById(pet.getId())).thenReturn(Optional.of(pet));

        assertThrows(ResourceNotFoundException.class, () -> access.requireAccess(pet.getId()));
    }

    @Test
    void ownerKeepsAccessWithoutABooking() {
        authenticateAs("CUSTOMER", pet.getOwnerId());
        when(pets.findById(pet.getId())).thenReturn(Optional.of(pet));

        assertSame(pet, access.requireOwnerOrAdmin(pet.getId()));
        verifyNoInteractions(bookings);
    }

    private void authenticateAs(String role, UUID userId) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "fixture", userId.toString(), List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
