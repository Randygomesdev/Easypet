package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.domain.model.StaffStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {
    List<Staff> findByPartnerId(UUID partnerId);
    List<Staff> findByPartnerIdAndStatus(UUID partnerId, StaffStatus status);
    List<Staff> findByPartnerIdAndServicesIdAndStatus(UUID partnerId, UUID serviceId, StaffStatus status);
}
