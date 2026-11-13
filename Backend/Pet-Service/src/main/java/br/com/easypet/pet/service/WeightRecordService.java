package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.entity.WeightRecord;
import br.com.easypet.pet.dto.request.WeightRecordRequest;
import br.com.easypet.pet.dto.response.WeightRecordResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.WeightRecordMapper;
import br.com.easypet.pet.repository.PetRepository;
import br.com.easypet.pet.repository.WeightRecordRepository;
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
public class WeightRecordService {

    private final WeightRecordRepository weightRecordRepository;
    private final PetRepository petRepository;
    private final PetAccessService petAccessService;
    private final WeightRecordMapper weightRecordMapper;

    //@CacheEvict(value = "weights", key = "#petId")
    public WeightRecordResponse create(UUID petId, WeightRecordRequest request) {
        log.info("Registrando nova pesagem para o pet ID: {}", petId);
        Pet pet = petAccessService.requireOwnerOrAdmin(petId);
        WeightRecord record = weightRecordMapper.toEntity(request, pet);

        pet.setWeight(request.weight());
        petRepository.save(pet);

        return weightRecordMapper.toResponse(weightRecordRepository.save(record));
    }

    @Transactional(readOnly = true)
    public Page<WeightRecordResponse> findAllByPet(UUID petId, Pageable pageable) {
        petAccessService.requireOwnerOrAdmin(petId);
        return weightRecordRepository.findAllByPetIdOrderByDateDesc(petId, pageable)
                .map(weightRecordMapper::toResponse);
    }

    //@CacheEvict(value = "weights", key = "#petId")
    public void delete(UUID petId, UUID recordId) {
        petAccessService.requireOwnerOrAdmin(petId);
        weightRecordRepository.findById(recordId)
                .filter(record -> record.getPet().getId().equals(petId))
                .ifPresentOrElse(weightRecordRepository::delete, () -> {
                    throw new ResourceNotFoundException("Pesagem não encontrada para este pet");
                });
    }

}
