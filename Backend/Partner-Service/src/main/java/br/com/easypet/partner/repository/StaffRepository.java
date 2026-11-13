package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.domain.model.StaffStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {
    List<Staff> findByPartnerId(UUID partnerId);
    List<Staff> findByPartnerIdAndStatus(UUID partnerId, StaffStatus status);
    List<Staff> findByPartnerIdAndServicesIdAndStatus(UUID partnerId, UUID serviceId, StaffStatus status);
    List<Staff> findByServicesId(UUID serviceId);
    List<Staff> findByPartnerIdAndTeamAccessIdIsNotNullOrderByNameAscIdAsc(UUID partnerId);
    Optional<Staff> findByPartnerIdAndTeamUserIdAndTeamAccessIdAndStatus(
            UUID partnerId, UUID userId, UUID accessId, StaffStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Staff> findByIdAndPartnerId(UUID staffId, UUID partnerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Staff s where s.id = :staffId")
    Optional<Staff> lockForSchedule(UUID staffId);
}
