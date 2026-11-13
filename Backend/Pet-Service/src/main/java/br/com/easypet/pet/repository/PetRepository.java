package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.Pet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface PetRepository extends JpaRepository<Pet, UUID>, JpaSpecificationExecutor<Pet> {

    Page<Pet> findByOwnerIdAndActiveTrue(UUID ownerId, Pageable pageable);

    Page<Pet> findByReceptionPartnerIdAndReceptionCustomerIdAndActiveTrueAndReceptionNameKeyContaining(
            UUID partnerId, UUID customerId, String term, Pageable pageable);

    Optional<Pet> findByIdAndReceptionPartnerIdAndReceptionCustomerIdAndActiveTrue(
            UUID id, UUID partnerId, UUID customerId);
}
