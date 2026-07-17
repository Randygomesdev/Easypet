package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.Surgery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SurgeryRepository extends JpaRepository<Surgery, UUID> {
    Page<Surgery> findAllByPetIdOrderByDateDesc(UUID petId, Pageable pageable);
}
