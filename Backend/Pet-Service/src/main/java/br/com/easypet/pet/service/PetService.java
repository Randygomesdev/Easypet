package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.PetResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.PetMapper;
import br.com.easypet.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @CacheEvict(value = "user_pets", key = "#p0")
    public PetResponse create(UUID ownerId, PetRequest request){
        log.info("Cadastrando novo pet para o dono: {}", ownerId);
        Pet pet = petMapper.toEntity(request, ownerId);
        return petMapper.toResponse(petRepository.save(pet));
    }

    @Transactional(readOnly = true)
    public Page<PetResponse> findAllByOwner(UUID ownerId, Pageable pageable){
        log.info("Buscando pets no BANCO para o dono: {}", ownerId);
        return petRepository.findByOwnerIdAndActiveTrue(ownerId, pageable)
                .map(petMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public PetResponse findById(UUID ownerId, UUID id) {
        log.info("Buscando detalhes do pet: {} para o dono: {}", id, ownerId);
        return petMapper.toResponse(findPetByIdAndOwner(ownerId, id));
    }

    @CacheEvict(value = "user_pets", key = "#p0")
    public PetResponse update(UUID ownerId, UUID id, PetRequest request){
        Pet pet = findPetByIdAndOwner(ownerId, id);
        log.info("Atualizando informações do pet: {}", pet.getName());
        petMapper.updateEntityFromRequest(request, pet);
        return petMapper.toResponse(petRepository.save(pet));
    }

    @CacheEvict(value = "user_pets", key = "#p0")
    public void delete(UUID ownerId, UUID id){
        log.info("Removendo pet para o dono: {}", ownerId);
        Pet pet = findPetByIdAndOwner(ownerId, id);
        pet.setActive(false);
        petRepository.save(pet);
    }

    @Transactional(readOnly = true)
    private Pet findPetByIdAndOwner(UUID ownerId, UUID id){
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdminOrPartner = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_PARTNER"));

        return petRepository.findById(id)
                .filter(p -> p.getOwnerId().equals(ownerId) || isAdminOrPartner)
                .orElseThrow(()-> new ResourceNotFoundException("Pet não encontrado ou você não tem permissão"));
    }
}
