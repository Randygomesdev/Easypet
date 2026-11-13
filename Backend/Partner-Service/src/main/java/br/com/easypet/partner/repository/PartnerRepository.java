package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.model.PartnerCategory;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;

@Repository
public interface PartnerRepository extends JpaRepository<Partner, UUID>, JpaSpecificationExecutor<Partner> {
    
    Page<Partner> findByActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Partner p WHERE p.active = true AND (" +
           "LOWER(p.name) LIKE :term OR " +
           "p.cnpj LIKE :term OR " +
           "LOWER(p.city) LIKE :term)")
    Page<Partner> searchActive(@Param("term") String term, Pageable pageable);

    Page<Partner> findByCategoriesContainingAndActiveTrue(PartnerCategory category, Pageable pageable);

    java.util.Optional<Partner> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Partner p where p.id = :id")
    Optional<Partner> lockById(UUID id);
}
