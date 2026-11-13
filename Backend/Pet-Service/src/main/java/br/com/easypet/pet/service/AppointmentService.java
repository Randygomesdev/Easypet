package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Appointment;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.AppointmentRequest;
import br.com.easypet.pet.dto.response.AppointmentResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

import br.com.easypet.pet.mapper.AppointmentMapper;
import br.com.easypet.pet.repository.AppointmentRepository;
import br.com.easypet.pet.repository.PetRepository;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentMapper appointmentMapper;
    private final PetRepository petRepository;
    private final PetAccessService petAccessService;

    @CacheEvict(value = "appointments", key = "#p0")
    public AppointmentResponse create(UUID petId, AppointmentRequest request) {
        log.info("Registrando consulta para o pet ID: {} | Motivo: {}", petId, request.reason());
        Pet pet = petAccessService.requireAccess(petId);
        Appointment appointment = appointmentMapper.toEntity(request, pet);

        if (request.weightAtTime() != null) {
            pet.setWeight(request.weightAtTime());
            petRepository.save(pet);
        }

        return appointmentMapper.toResponse(appointmentRepository.save(appointment));
    }

    @Transactional(readOnly = true)
    public Page<AppointmentResponse> findAllByPet(UUID petId, Pageable pageable) {
        log.info("Buscando consultas no BANCO para o pet: {} (e salvando no Redis)", petId);
        petAccessService.requireAccess(petId);
        return appointmentRepository.findAllByPetIdOrderByDateDesc(petId, pageable)
                .map(appointmentMapper::toResponse);
    }

    @CacheEvict(value = "appointments", key = "#p0")
    public AppointmentResponse update(UUID petId, UUID appointmentId, AppointmentRequest request) {
        log.info("Atualizando consulta ID: {} do pet ID: {}", appointmentId, petId);
        petAccessService.requireOwnerOrAdmin(petId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .filter(a -> a.getPet().getId().equals(petId))
                .orElseThrow(() -> new ResourceNotFoundException("Consulta não encontrada para este pet"));
        updateAppointmentFromRequest(appointment, request);
        return appointmentMapper.toResponse(appointmentRepository.save(appointment));
    }

    @CacheEvict(value = "appointments", key = "#p0")
    public void delete(UUID petId, UUID appointmentId) {
        log.warn("Excluindo registro de consulta ID: {} do pet ID: {}", appointmentId, petId);
        petAccessService.requireOwnerOrAdmin(petId);
        appointmentRepository.findById(appointmentId)
                .filter(record -> record.getPet().getId().equals(petId))
                .ifPresentOrElse(appointmentRepository::delete, () -> {
                    throw new ResourceNotFoundException("Consulta não encontrada para este pet");
                });
    }

    private void updateAppointmentFromRequest(Appointment appointment, AppointmentRequest request) {
        appointment.setDate(request.date());
        appointment.setReason(request.reason());
        appointment.setClinicalNotes(request.clinicalNotes());
        appointment.setVetName(request.vetName());
        appointment.setProviderId(request.providerId());
        appointment.setWeightAtTime(request.weightAtTime());
        appointment.setStatus(request.status());
    }
}
