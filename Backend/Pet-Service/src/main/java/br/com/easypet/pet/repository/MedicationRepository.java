package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MedicationRepository extends JpaRepository<Medication, UUID> {
    List<Medication> findAllByPetIdOrderByStartDateDesc(UUID petId);
    List<Medication> findAllByPetIdAndActiveTrue(UUID petId);
}
