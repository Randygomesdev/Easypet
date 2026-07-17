package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Appointment;
import br.com.easypet.pet.domain.entity.Medication;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.MedicationRequest;
import br.com.easypet.pet.dto.response.MedicationResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.MedicationMapper;
import br.com.easypet.pet.repository.AppointmentRepository;
import br.com.easypet.pet.repository.MedicationRepository;
import br.com.easypet.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final AppointmentRepository appointmentRepository;
    private final PetRepository petRepository;
    private final MedicationMapper medicationMapper;

    @CacheEvict(value = "medications", key = "#p0")
    public MedicationResponse create(UUID petId, MedicationRequest request) {
        log.info("Registrando medicamento '{}' para o pet ID: {}", request.name(), petId);
        Pet pet = findPetIfOwner(petId);

        Appointment appointment = null;
        if (request.appointmentId() != null) {
            appointment = appointmentRepository.findById(request.appointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Consulta não encontrada"));
        }
        Medication medication = medicationMapper.toEntity(request, pet, appointment);
        return medicationMapper.toResponse(medicationRepository.save(medication));
    }
    @Transactional(readOnly = true)
    public List<MedicationResponse> findAllByPet(UUID petId) {
        findPetIfOwner(petId);
        return medicationRepository.findAllByPetIdOrderByStartDateDesc(petId)
                .stream()
                .map(medicationMapper::toResponse)
                .toList();
    }

    @CacheEvict(value = "medications", key = "#p0")
    public MedicationResponse update(UUID petId, UUID medicationId, MedicationRequest request) {
        log.info("Atualizando medicamento ID: {} para o pet ID: {}", medicationId, petId);
        findPetIfOwner(petId);

        Medication medication = medicationRepository.findById(medicationId)
                .filter(m -> m.getPet().getId().equals(petId))
                .orElseThrow(() -> new ResourceNotFoundException("Medicamento não encontrado"));
        updateMedicationFromRequest(medication, request);
        return medicationMapper.toResponse(medicationRepository.save(medication));
    }

    @CacheEvict(value = "medications", key = "#p0")
    public void delete(UUID petId, UUID medicationId) {
        findPetIfOwner(petId);
        medicationRepository.deleteById(medicationId);
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

    private void updateMedicationFromRequest(Medication medication, MedicationRequest request) {
        medication.setName(request.name());
        medication.setDosage(request.dosage());
        medication.setFrequency(request.frequency());
        medication.setStartDate(request.startDate());
        medication.setEndDate(request.endDate());
        medication.setObservations(request.observations());
        medication.setActive(request.active());
    }

}
