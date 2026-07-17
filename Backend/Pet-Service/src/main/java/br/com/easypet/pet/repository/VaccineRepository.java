package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.Vaccine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.UUID;

public interface VaccineRepository extends JpaRepository<Vaccine, UUID> {
    Page<Vaccine> findAllByPetIdOrderByApplicationDateDesc(UUID petId, Pageable pageable);
    java.util.List<Vaccine> findAllByPetIdOrderByApplicationDateDesc(UUID petId);
}
