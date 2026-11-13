package br.com.easypet.pet.service;

import br.com.easypet.pet.client.BookingAccessClient;
import br.com.easypet.pet.client.CustomerMembershipClient;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.model.HistorySource;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PetAccessService {

    private final PetRepository petRepository;
    private final BookingAccessClient bookingAccessClient;
    private final CustomerMembershipClient memberships;

    public Pet requireAccess(UUID petId) {
        return findActivePet(petId, true);
    }

    public Pet requireOwnerOrAdmin(UUID petId) {
        return findActivePet(petId, false);
    }

    public void requireEditableSource(HistorySource source) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (source == HistorySource.PLATFORM && (auth == null || !hasRole(auth, "ROLE_ADMIN"))) {
            throw new ResourceNotFoundException("Registro da plataforma indisponível para alteração");
        }
    }

    public HistorySource historySource() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && (hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_PARTNER"))
                ? HistorySource.PLATFORM : HistorySource.OWNER;
    }

    private Pet findActivePet(UUID petId, boolean allowPartner) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return petRepository.findById(petId)
                .filter(pet -> Boolean.TRUE.equals(pet.getActive()))
                .filter(pet -> auth != null && canAccess(pet, auth, allowPartner))
                .orElseThrow(() -> new ResourceNotFoundException("Pet não encontrado ou acesso negado"));
    }

    private boolean canAccess(Pet pet, Authentication auth, boolean allowPartner) {
        if (pet.getOwnerId() == null) {
            return hasRole(auth, "ROLE_CUSTOMER") && memberships.findClaimedCustomers().stream()
                    .anyMatch(owned -> owned.customerId().equals(pet.getReceptionCustomerId())
                            && owned.partnerId().equals(pet.getReceptionPartnerId()));
        }
        if (pet.getOwnerId().toString().equals(auth.getCredentials()) || hasRole(auth, "ROLE_ADMIN")) {
            return true;
        }
        return allowPartner && hasRole(auth, "ROLE_PARTNER")
                && bookingAccessClient.hasPetAccess(pet.getId(), pet.getOwnerId());
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals(role));
    }
}
