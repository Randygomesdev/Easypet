package br.com.easypet.partner.controller;

import br.com.easypet.partner.domain.model.StaffStatus;
import br.com.easypet.partner.dto.response.StaffScheduleResponse;
import br.com.easypet.partner.service.StaffService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@Hidden
@RequestMapping("/internal/partners")
@RequiredArgsConstructor
public class InternalStaffController {
    private final StaffService staffService;

    @GetMapping("/{partnerId}/staff")
    public List<AvailabilityStaff> getActiveStaff(@PathVariable UUID partnerId,
            @RequestParam(required = false) UUID serviceId) {
        return staffService.getStaffByPartnerId(partnerId, StaffStatus.ACTIVE, serviceId).stream()
                .map(staff -> new AvailabilityStaff(staff.id(), staff.partnerId(), staff.name(),
                        staff.jobTitle(), staff.status(), staff.serviceIds()))
                .toList();
    }

    @GetMapping("/staff/{staffId}/schedule")
    public List<StaffScheduleResponse> getSchedule(@PathVariable UUID staffId) {
        return staffService.getStaffSchedule(staffId);
    }

    @GetMapping("/staff/{staffId}/absences")
    public List<AvailabilityAbsence> getAbsences(@PathVariable UUID staffId) {
        return staffService.getStaffAbsences(staffId).stream()
                .map(absence -> new AvailabilityAbsence(absence.id(), absence.staffId(),
                        absence.startDate(), absence.endDate()))
                .toList();
    }

    public record AvailabilityStaff(UUID id, UUID partnerId, String name, String jobTitle,
                                    StaffStatus status, Set<UUID> serviceIds) {}

    public record AvailabilityAbsence(UUID id, UUID staffId, LocalDateTime startDate, LocalDateTime endDate) {}
}
