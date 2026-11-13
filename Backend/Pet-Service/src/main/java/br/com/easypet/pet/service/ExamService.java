package br.com.easypet.pet.service;

import br.com.easypet.pet.domain.entity.Exam;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.ExamRequest;
import br.com.easypet.pet.dto.response.ExamResponse;
import br.com.easypet.pet.exception.ResourceNotFoundException;
import br.com.easypet.pet.mapper.ExamMapper;
import br.com.easypet.pet.repository.ExamRepository;
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
public class ExamService {

    private final ExamRepository examRepository;
    private final PetAccessService petAccessService;
    private final ExamMapper examMapper;

    @CacheEvict(value = "exams", key = "#p0")
    public ExamResponse create(UUID petId, ExamRequest request) {
        log.info("Registrando exame '{}' para o pet ID: {}", request.examName(), petId);
        Pet pet = petAccessService.requireAccess(petId);
        Exam exam = examMapper.toEntity(request, pet);
        return examMapper.toResponse(examRepository.save(exam));
    }

    @Transactional(readOnly = true)
    public Page<ExamResponse> findAllByPet(UUID petId, Pageable pageable) {
        petAccessService.requireAccess(petId);
        return examRepository.findAllByPetIdOrderByDateDesc(petId, pageable)
                .map(examMapper::toResponse);
    }

    @CacheEvict(value = "exams", key = "#p0")
    public ExamResponse update(UUID petId, UUID examId, ExamRequest request) {
        log.info("Atualizando exame ID: {} para o pet ID: {}", examId, petId);
        petAccessService.requireOwnerOrAdmin(petId);

        Exam exam = examRepository.findById(examId)
                .filter(e -> e.getPet().getId().equals(petId))
                .orElseThrow(() -> new ResourceNotFoundException("Exame não encontrado"));
        updateExamFromRequest(exam, request);
        return examMapper.toResponse(examRepository.save(exam));
    }

    @CacheEvict(value = "exams", key = "#p0")
    public void delete(UUID petId, UUID examId) {
        petAccessService.requireOwnerOrAdmin(petId);
        examRepository.findById(examId)
                .filter(record -> record.getPet().getId().equals(petId))
                .ifPresentOrElse(examRepository::delete, () -> {
                    throw new ResourceNotFoundException("Exame não encontrado para este pet");
                });
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
