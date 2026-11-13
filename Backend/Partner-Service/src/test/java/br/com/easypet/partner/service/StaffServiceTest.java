package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.domain.model.StaffStatus;
import br.com.easypet.partner.dto.request.StaffScheduleRequest;
import br.com.easypet.partner.dto.response.StaffScheduleResponse;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.repository.StaffRepository;
import br.com.easypet.partner.repository.StaffScheduleRepository;
import br.com.easypet.partner.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StaffServiceTest {

    @Autowired
    private StaffService staffService;

    @Autowired
    private PartnerRepository partnerRepository;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private StaffScheduleRepository staffScheduleRepository;

    private Staff staff;

    @BeforeEach
    void setUp() {
        UUID ownerId = UUID.randomUUID();
        Partner partner = Partner.builder()
                .userId(ownerId)
                .name("Clínica Beiramar")
                .legalName("Clínica Veterinária Beiramar LTDA")
                .cnpj("12345678901234")
                .email("contato@beiramar.com")
                .phone("123456789")
                .active(true)
                .build();
        partner = partnerRepository.save(partner);

        staff = Staff.builder()
                .name("Natalia")
                .status(StaffStatus.ACTIVE)
                .partner(partner)
                .services(new HashSet<>())
                .createdAt(java.time.LocalDateTime.now())
                .build();
        staff = staffRepository.save(staff);
        authenticatePartner(ownerId);
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private void authenticatePartner(UUID userId) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new UserPrincipal(userId.toString(), "pilot@example.test", "Parceiro"), null,
                List.of(new SimpleGrantedAuthority("ROLE_PARTNER"))));
    }

    @Test
    void updateStaffSchedule_ShouldSaveSchedulesSuccessfully() {
        // Arrange
        StaffScheduleRequest request = new StaffScheduleRequest(2, LocalTime.of(8, 0), LocalTime.of(18, 0), null, null);

        // Act
        List<StaffScheduleResponse> response = staffService.updateStaffSchedule(staff.getId(), List.of(request));

        // Assert
        assertNotNull(response);
        assertEquals(1, response.size());
        assertEquals(2, response.get(0).dayOfWeek());
        assertEquals(LocalTime.of(8, 0), response.get(0).startTime());
        assertEquals(LocalTime.of(18, 0), response.get(0).endTime());

        // Verify in DB via direct query
        var dbSchedules = staffScheduleRepository.findByStaffId(staff.getId());
        assertEquals(1, dbSchedules.size());
        assertEquals(2, dbSchedules.get(0).getDayOfWeek());
        assertEquals(LocalTime.of(8, 0), dbSchedules.get(0).getStartTime());
    }

    @Test
    void anotherPartnerCannotReadOrChangeStaffSchedule() {
        authenticatePartner(UUID.randomUUID());

        assertThrows(AccessDeniedException.class, () -> staffService.requireStaffAccess(staff.getId()));
        assertThrows(AccessDeniedException.class, () -> staffService.updateStaffSchedule(staff.getId(), List.of()));
    }
}
