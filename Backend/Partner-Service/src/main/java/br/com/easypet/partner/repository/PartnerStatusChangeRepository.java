package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.PartnerStatusChange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PartnerStatusChangeRepository extends JpaRepository<PartnerStatusChange, UUID> {
    Page<PartnerStatusChange> findByPartnerId(UUID partnerId, Pageable pageable);
}
