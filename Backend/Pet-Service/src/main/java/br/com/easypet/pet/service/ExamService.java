package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Exam;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.ExamRequest;
import br.com.easypet.pet.dto.response.ExamResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.ExamMapper;
import br.com.easypet.pet.repository.ExamRepository;
import br.com.easypet.pet.repository.PetRepository;
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

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class ExamService {

    private final ExamRepository examRepository;
    private final PetRepository petRepository;
    private final ExamMapper examMapper;

    @CacheEvict(value = "exams", key = "#p0")
    public ExamResponse create(UUID petId, ExamRequest request) {
        log.info("Registrando exame '{}' para o pet ID: {}", request.examName(), petId);
        Pet pet = findPetIfOwner(petId);
        Exam exam = examMapper.toEntity(request, pet);
        return examMapper.toResponse(examRepository.save(exam));
    }

    @Transactional(readOnly = true)
    public Page<ExamResponse> findAllByPet(UUID petId, Pageable pageable) {
        findPetIfOwner(petId);
        return examRepository.findAllByPetIdOrderByDateDesc(petId, pageable)
                .map(examMapper::toResponse);
    }

    @CacheEvict(value = "exams", key = "#p0")
    public ExamResponse update(UUID petId, UUID examId, ExamRequest request) {
        log.info("Atualizando exame ID: {} para o pet ID: {}", examId, petId);
        findPetIfOwner(petId);

        Exam exam = examRepository.findById(examId)
                .filter(e -> e.getPet().getId().equals(petId))
                .orElseThrow(() -> new ResourceNotFoundException("Exame não encontrado"));
        updateExamFromRequest(exam, request);
        return examMapper.toResponse(examRepository.save(exam));
    }

    @CacheEvict(value = "exams", key = "#p0")
    public void delete(UUID petId, UUID examId) {
        findPetIfOwner(petId);
        examRepository.deleteById(examId);
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

    private void updateExamFromRequest(Exam exam, ExamRequest request) {
        exam.setExamName(request.examName());
        exam.setDate(request.date());
        exam.setLaboratory(request.laboratory());
        exam.setVetName(request.veterinarianName());
        exam.setResultsSummary(request.resultsSummary());
        exam.setFileUrl(request.fileUrl());
    }
}
