package br.com.easypet.payment.repository;

import br.com.easypet.payment.domain.entity.PackageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PackageTemplateRepository extends JpaRepository<PackageTemplate, UUID> {
    List<PackageTemplate> findByPartnerIdAndIsActiveTrue(UUID partnerId);
}
