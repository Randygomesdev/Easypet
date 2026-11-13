package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.client.CustomerMembershipClient;
import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.PetResponse;
import br.com.easypet.pet.mapper.PetMapper;
import br.com.easypet.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class PetService {

    private final PetRepository petRepository;
    private final PetMapper petMapper;
    private final PetAccessService petAccessService;
    private final CustomerMembershipClient memberships;

    @CacheEvict(value = "user_pets", key = "#p0")
    public PetResponse create(UUID ownerId, PetRequest request){
        log.info("Cadastrando novo pet para o dono: {}", ownerId);
        Pet pet = petMapper.toEntity(request, ownerId);
        return petMapper.toResponse(petRepository.save(pet));
    }

    @Transactional(readOnly = true)
    public Page<PetResponse> findAllByOwner(UUID ownerId, Pageable pageable){
        log.info("Buscando pets no BANCO para o dono: {}", ownerId);
        var actor = SecurityContextHolder.getContext().getAuthentication();
        if (actor.getAuthorities().stream().noneMatch(role -> role.getAuthority().equals("ROLE_CUSTOMER"))) {
            return petRepository.findByOwnerIdAndActiveTrue(ownerId, pageable).map(petMapper::toResponse);
        }
        var claimed = memberships.findClaimedCustomers();
        Specification<Pet> owned = (root, query, criteria) -> {
            var ownership = criteria.equal(root.get("ownerId"), ownerId);
            for (var record : claimed) {
                ownership = criteria.or(ownership, criteria.and(criteria.isNull(root.get("ownerId")),
                        criteria.equal(root.get("receptionCustomerId"), record.customerId()),
                        criteria.equal(root.get("receptionPartnerId"), record.partnerId())));
            }
            return criteria.and(criteria.isTrue(root.get("active")), ownership);
        };
        return petRepository.findAll(owned, pageable).map(pet -> petMapper.toResponse(pet, ownerId));
    }

    @Transactional(readOnly = true)
    public PetResponse findById(UUID id) {
        Pet pet = petAccessService.requireAccess(id);
        UUID ownerId = pet.getOwnerId() == null ? UUID.fromString(SecurityContextHolder.getContext()
                .getAuthentication().getCredentials().toString()) : pet.getOwnerId();
        return petMapper.toResponse(pet, ownerId);
    }

    @CacheEvict(value = "user_pets", key = "#p0")
    public PetResponse update(UUID ownerId, UUID id, PetRequest request){
        Pet pet = petAccessService.requireOwnerOrAdmin(id);
        log.info("Atualizando informações do pet: {}", pet.getName());
        petMapper.updateEntityFromRequest(request, pet);
        return petMapper.toResponse(petRepository.save(pet), pet.getOwnerId() == null ? ownerId : pet.getOwnerId());
    }

    @CacheEvict(value = "user_pets", key = "#p0")
    public void delete(UUID ownerId, UUID id){
        log.info("Removendo pet para o dono: {}", ownerId);
        Pet pet = petAccessService.requireOwnerOrAdmin(id);
        pet.setActive(false);
        petRepository.save(pet);
    }

}
