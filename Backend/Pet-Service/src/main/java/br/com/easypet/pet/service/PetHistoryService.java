package br.com.easypet.pet.service;

import br.com.easypet.pet.dto.response.PetHistoryResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.AppointmentMapper;
import br.com.easypet.pet.mapper.ExamMapper;
import br.com.easypet.pet.mapper.MedicationMapper;
import br.com.easypet.pet.mapper.VaccineMapper;
import br.com.easypet.pet.repository.AppointmentRepository;
import br.com.easypet.pet.repository.ExamRepository;
import br.com.easypet.pet.repository.MedicationRepository;
import br.com.easypet.pet.repository.PetRepository;
import br.com.easypet.pet.repository.VaccineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PetHistoryService {

    private final PetRepository petRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicationRepository medicationRepository;
    private final ExamRepository examRepository;
    private final VaccineRepository vaccineRepository;
    private final AppointmentMapper appointmentMapper;
    private final MedicationMapper medicationMapper;
    private final ExamMapper examMapper;
    private final VaccineMapper vaccineMapper;

    public PetHistoryResponse getHistory(UUID petId) {
        log.info("Buscando prontuário completo do pet ID: {}", petId);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isPartnerOrAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_PARTNER"));

        if (isPartnerOrAdmin) {
            petRepository.findById(petId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pet não encontrado"));
        } else {
            UUID currentUserId = UUID.fromString(auth.getCredentials().toString());
            petRepository.findById(petId)
                    .filter(p -> p.getOwnerId().equals(currentUserId))
                    .orElseThrow(() -> new ResourceNotFoundException("Pet não encontrado ou acesso negado"));
        }

        return new PetHistoryResponse(
            appointmentRepository.findAllByPetIdOrderByDateDesc(petId)
                .stream().map(appointmentMapper::toResponse).toList(),
            medicationRepository.findAllByPetIdOrderByStartDateDesc(petId)
                .stream().map(medicationMapper::toResponse).toList(),
            examRepository.findAllByPetIdOrderByDateDesc(petId)
                .stream().map(examMapper::toResponse).toList(),
            vaccineRepository.findAllByPetIdOrderByApplicationDateDesc(petId)
                .stream().map(vaccineMapper::toResponse).toList()
        );
    }
}
