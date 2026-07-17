package br.com.easypet.partner.repository;

import br.com.easypet.partner.domain.entity.StaffSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffScheduleRepository extends JpaRepository<StaffSchedule, UUID> {
    List<StaffSchedule> findByStaffId(UUID staffId);
    void deleteByStaffId(UUID staffId);
}
