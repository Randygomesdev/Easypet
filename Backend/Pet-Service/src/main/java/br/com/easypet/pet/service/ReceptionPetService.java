package br.com.easypet.pet.service;

import br.com.easypet.pet.client.CustomerMembershipClient;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.ReceptionPetResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.PetMapper;
import br.com.easypet.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceptionPetService {
    private final CustomerMembershipClient memberships;
    private final PetRepository pets;
    private final PetMapper mapper;

    public Page<ReceptionPetResponse> list(UUID customerId, String authorization, String q, int page, int size) {
        UUID partnerId = memberships.requirePartner(customerId, authorization);
        return pets.findByReceptionPartnerIdAndReceptionCustomerIdAndActiveTrueAndReceptionNameKeyContaining(
                partnerId, customerId, nameKey(q), PageRequest.of(page, size, Sort.by("receptionNameKey", "id")))
                .map(ReceptionPetResponse::from);
    }

    public ReceptionPetResponse find(UUID customerId, String authorization, UUID petId) {
        UUID partnerId = memberships.requirePartner(customerId, authorization);
        return pets.findByIdAndReceptionPartnerIdAndReceptionCustomerIdAndActiveTrue(petId, partnerId, customerId)
                .map(ReceptionPetResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Pet não encontrado neste escopo."));
    }

    public ReceptionPetResponse create(UUID customerId, String authorization, PetRequest request) {
        UUID partnerId = memberships.requirePartner(customerId, authorization);
        Pet pet = mapper.toEntity(request, null);
        String name = cleanName(pet.getName());
        String breed = cleanName(pet.getBreed());
        String chip = pet.getMicrochipNumber() == null ? "" : pet.getMicrochipNumber().strip();
        if (name.isEmpty() || name.length() > 255 || breed.isEmpty() || breed.length() > 255
                || chip.length() > 100 || !Double.isFinite(request.weight())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confira os dados do pet.");
        }
        pet.setName(name);
        pet.setBreed(breed);
        pet.setMicrochipNumber(chip.isEmpty() ? null : chip);
        pet.setReceptionCustomerId(customerId);
        pet.setReceptionPartnerId(partnerId);
        pet.setReceptionNameKey(nameKey(name));
        try {
            return ReceptionPetResponse.from(pets.saveAndFlush(pet));
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && ("pets_reception_identity_unique".equals(violation.getConstraintName())
                        || "pets_microchip_number_key".equals(violation.getConstraintName()))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Já existe um cadastro com esses dados. Confira o nome, nascimento e microchip do pet.");
            }
            throw exception;
        }
    }

    private static String cleanName(String name) {
        return name.strip().replaceAll("(?U)\\s+", " ").strip();
    }

    private static String nameKey(String name) {
        return cleanName(name).toLowerCase(Locale.ROOT);
    }
}
