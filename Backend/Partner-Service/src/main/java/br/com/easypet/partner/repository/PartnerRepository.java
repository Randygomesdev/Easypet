package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.model.PartnerCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PartnerRepository extends JpaRepository<Partner, UUID> {
    
    Page<Partner> findByActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Partner p WHERE p.active = true AND (" +
           "LOWER(p.name) LIKE :term OR " +
           "p.cnpj LIKE :term OR " +
           "LOWER(p.city) LIKE :term)")
    Page<Partner> searchActive(@Param("term") String term, Pageable pageable);

    Page<Partner> findByCategoriesContainingAndActiveTrue(PartnerCategory category, Pageable pageable);

    java.util.Optional<Partner> findByUserId(UUID userId);
}
