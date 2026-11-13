package br.com.easypet.pet.service;

import br.com.easypet.pet.client.BookingAccessClient;
import br.com.easypet.pet.client.CustomerMembershipClient;
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
    private final CustomerMembershipClient memberships = mock(CustomerMembershipClient.class);
    private final PetAccessService access = new PetAccessService(pets, bookings, memberships);
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

    @Test
    void unclaimedDeskPetCannotBeAccessedThroughEstablishedHistoryRoutes() {
        Pet deskPet = Pet.builder().id(UUID.randomUUID()).receptionCustomerId(UUID.randomUUID())
                .receptionPartnerId(UUID.randomUUID()).build();
        when(pets.findById(deskPet.getId())).thenReturn(Optional.of(deskPet));

        for (String role : List.of("CUSTOMER", "PARTNER", "ADMIN")) {
            authenticateAs(role, deskPet.getReceptionCustomerId());
            assertThrows(ResourceNotFoundException.class, () -> access.requireAccess(deskPet.getId()));
            assertThrows(ResourceNotFoundException.class, () -> access.requireOwnerOrAdmin(deskPet.getId()));
        }
        verifyNoInteractions(bookings);
    }

    @Test
    void claimingRequiresBothMembershipIdsAndKeepsTheHistoricalPet() {
        UUID user = UUID.randomUUID();
        UUID customer = UUID.randomUUID();
        UUID partner = UUID.randomUUID();
        Pet deskPet = Pet.builder().id(UUID.randomUUID()).receptionCustomerId(customer).receptionPartnerId(partner).build();
        when(pets.findById(deskPet.getId())).thenReturn(Optional.of(deskPet));
        authenticateAs("CUSTOMER", user);
        when(memberships.findClaimedCustomers()).thenReturn(List.of(new CustomerMembershipClient.Membership(customer, UUID.randomUUID())));
        assertThrows(ResourceNotFoundException.class, () -> access.requireAccess(deskPet.getId()));
        when(memberships.findClaimedCustomers()).thenReturn(List.of(new CustomerMembershipClient.Membership(customer, partner)));
        assertSame(deskPet, access.requireAccess(deskPet.getId()));
        verifyNoInteractions(bookings);
    }

    private void authenticateAs(String role, UUID userId) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "fixture", userId.toString(), List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
