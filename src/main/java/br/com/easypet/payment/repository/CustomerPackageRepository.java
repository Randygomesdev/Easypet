package br.com.easypet.payment.repository;

import br.com.easypet.payment.domain.entity.CustomerPackage;
import br.com.easypet.payment.domain.enums.CustomerPackageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CustomerPackageRepository extends JpaRepository<CustomerPackage, UUID> {
    List<CustomerPackage> findByUserId(UUID userId);
    List<CustomerPackage> findByUserIdAndStatus(UUID userId, CustomerPackageStatus status);
    List<CustomerPackage> findByUserIdAndPartnerIdAndServiceIdAndStatusAndRemainingCreditsGreaterThan(
            UUID userId, UUID partnerId, UUID serviceId, CustomerPackageStatus status, Integer minCredits);
}
