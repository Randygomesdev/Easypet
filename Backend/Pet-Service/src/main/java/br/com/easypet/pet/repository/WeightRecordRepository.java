package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.WeightRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface WeightRecordRepository extends JpaRepository<WeightRecord, UUID> {
    Page<WeightRecord> findAllByPetIdOrderByDateDesc(UUID petId,  Pageable pageable);

}
