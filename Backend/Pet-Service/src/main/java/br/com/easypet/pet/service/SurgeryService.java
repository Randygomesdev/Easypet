package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.entity.Surgery;
import br.com.easypet.pet.domain.model.HistorySource;
import br.com.easypet.pet.dto.request.SurgeryRequest;
import br.com.easypet.pet.dto.response.SurgeryResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.SurgeryMapper;
import br.com.easypet.pet.repository.SurgeryRepository;
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
public class SurgeryService {

    private final SurgeryRepository surgeryRepository;
    private final PetAccessService petAccessService;
    private final SurgeryMapper surgeryMapper;

    @CacheEvict(value = "surgeries", key = "#p0")
    public SurgeryResponse create(UUID petId, SurgeryRequest request) {
        log.info("Registrando cirurgia '{}' para o pet ID: {}", request.description(), petId);
        Pet pet = petAccessService.requireOwnerOrAdmin(petId);
        Surgery surgery = surgeryMapper.toEntity(request, pet, petAccessService.historySource());
        return surgeryMapper.toResponse(surgeryRepository.save(surgery));
    }

    @Transactional(readOnly = true)
    public Page<SurgeryResponse> findAllByPet(UUID petId, Pageable pageable) {
        petAccessService.requireOwnerOrAdmin(petId);
        return surgeryRepository.findAllByPetIdOrderByDateDesc(petId, pageable)
                .map(surgeryMapper::toResponse);
    }

    @CacheEvict(value = "surgeries", key = "#p0")
    public SurgeryResponse update(UUID petId, UUID surgeryId, SurgeryRequest request) {
        log.info("Atualizando cirurgia ID: {} para o pet ID: {}", surgeryId, petId);
        petAccessService.requireOwnerOrAdmin(petId);

        Surgery surgery = surgeryRepository.findById(surgeryId)
                .filter(s -> s.getPet().getId().equals(petId))
                .orElseThrow(() -> new ResourceNotFoundException("Cirurgia não encontrada"));
        petAccessService.requireEditableSource(surgery.getSource());
        updateSurgeryFromRequest(surgery, request);
        return surgeryMapper.toResponse(surgeryRepository.save(surgery));
    }

    @CacheEvict(value = "surgeries", key = "#p0")
    public void delete(UUID petId, UUID surgeryId) {
        petAccessService.requireOwnerOrAdmin(petId);
        surgeryRepository.findById(surgeryId)
                .filter(record -> record.getPet().getId().equals(petId))
                .ifPresentOrElse(record -> {
                    petAccessService.requireEditableSource(record.getSource());
                    surgeryRepository.delete(record);
                }, () -> {
                    throw new ResourceNotFoundException("Cirurgia não encontrada para este pet");
                });
    }


    private void updateSurgeryFromRequest(Surgery surgery, SurgeryRequest request) {
        surgery.setDescription(request.description());
        surgery.setDate(request.date());
        surgery.setVetName(request.vetName());
        surgery.setProviderId(request.providerId());
        surgery.setAnesthesiaType(request.anesthesiaType());
        surgery.setPostOperativeInstructions(request.postOperativeInstructions());
        surgery.setStatus(request.status());
    }
}
