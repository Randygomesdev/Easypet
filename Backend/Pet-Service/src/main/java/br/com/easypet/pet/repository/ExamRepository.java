package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.Exam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ExamRepository extends JpaRepository<Exam, UUID> {
    Page<Exam> findAllByPetIdOrderByDateDesc(UUID petId, Pageable pageable);
    java.util.List<Exam> findAllByPetIdOrderByDateDesc(UUID petId);
}
