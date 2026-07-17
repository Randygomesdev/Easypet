package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.StaffAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StaffAbsenceRepository extends JpaRepository<StaffAbsence, UUID> {
    List<StaffAbsence> findByStaffId(UUID staffId);
    List<StaffAbsence> findByStaffIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(UUID staffId, LocalDateTime end, LocalDateTime start);
}
