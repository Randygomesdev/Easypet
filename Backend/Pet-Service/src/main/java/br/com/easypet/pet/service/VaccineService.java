package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.entity.Vaccine;
import br.com.easypet.pet.dto.request.VaccineRequest;
import br.com.easypet.pet.dto.response.VaccineResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.VaccineMapper;
import br.com.easypet.pet.repository.PetRepository;
import br.com.easypet.pet.repository.VaccineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class VaccineService {

    private final VaccineRepository vaccineRepository;
    private final PetRepository petRepository;
    private final VaccineMapper vaccineMapper;

    @CacheEvict(value = "vaccines", key = "#p0")
    public VaccineResponse create(UUID petId, VaccineRequest request) {
        log.info("Iniciando cadastro de vacina '{}' para o pet ID: {}", request.name(), petId);

        Pet pet = findPetIfOwner(petId);
        Vaccine vaccine = vaccineMapper.toEntity(request, pet);
        Vaccine saved =  vaccineRepository.save(vaccine);
        log.info("Vacina cadastrada com sucesso! ID da vacina: {}", saved.getId());
        return vaccineMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<VaccineResponse> findAllByPet(UUID petId, Pageable pageable) {
        log.info("Buscando histórico de vacinas para o pet ID: {}", petId);

        findPetIfOwner(petId);
        return vaccineRepository.findAllByPetIdOrderByApplicationDateDesc(petId, pageable)
                .map(vaccineMapper::toResponse);
    }

    @CacheEvict(value = "vaccines", key = "#p0")
    public VaccineResponse update(UUID petId,UUID vaccineId, VaccineRequest request) {
        log.info("Atualizando vacina ID: {} para o pet ID: {}", vaccineId, petId);

        Pet pet = findPetIfOwner(petId);
        Vaccine vaccine = vaccineRepository.findById(vaccineId)
                .filter(v-> v.getPet().getId().equals(petId))
                .orElseThrow(()-> new ResourceNotFoundException("Vacina não encontrada para este pet"));

        updateVaccineFromRequest(vaccine, request);

        return vaccineMapper.toResponse(vaccineRepository.save(vaccine));
    }

    @CacheEvict(value = "vaccines", key = "#p0")
    public void delete(UUID petId, UUID vaccineId) {
        log.warn("Solicitação de exclusão da vacina ID: {} para o pet ID: {}", vaccineId, petId);

        findPetIfOwner(petId);
        vaccineRepository.deleteById(vaccineId);
        log.info("Vacina excluída com sucesso!");
    }

    @Transactional(readOnly = true)
    private Pet findPetIfOwner(UUID petId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isPartnerOrAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_PARTNER"));
        return petRepository.findById(petId)
                .filter(p -> isPartnerOrAdmin || p.getOwnerId().equals(UUID.fromString(auth.getCredentials().toString())))
                .orElseThrow(() -> new ResourceNotFoundException("Pet não encontrado ou acesso negado"));
    }

    private UUID getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return UUID.fromString(authentication.getCredentials().toString());
    }

    private void updateVaccineFromRequest(Vaccine vaccine, VaccineRequest request) {
        vaccine.setName(request.name());
        vaccine.setApplicationDate(request.applicationDate());
        vaccine.setNextDoseDate(request.nextDoseDate());
        vaccine.setVetName(request.vetName());
        vaccine.setManufacturer(request.manufacturer());
        vaccine.setLot(request.lot());
        vaccine.setObservations(request.observations());
        vaccine.setStatus(request.status());
    }
}
