package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.PetResponse;
import br.com.easypet.pet.mapper.PetMapper;
import br.com.easypet.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
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
    private final PetAccessService petAccessService;

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
    public PetResponse findById(UUID id) {
        return petMapper.toResponse(petAccessService.requireAccess(id));
    }

    @CacheEvict(value = "user_pets", key = "#p0")
    public PetResponse update(UUID ownerId, UUID id, PetRequest request){
        Pet pet = petAccessService.requireOwnerOrAdmin(id);
        log.info("Atualizando informações do pet: {}", pet.getName());
        petMapper.updateEntityFromRequest(request, pet);
        return petMapper.toResponse(petRepository.save(pet));
    }

    @CacheEvict(value = "user_pets", key = "#p0")
    public void delete(UUID ownerId, UUID id){
        log.info("Removendo pet para o dono: {}", ownerId);
        Pet pet = petAccessService.requireOwnerOrAdmin(id);
        pet.setActive(false);
        petRepository.save(pet);
    }

}
