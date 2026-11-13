package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.domain.entity.ServiceOffer;
import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.domain.entity.StaffSchedule;
import br.com.easypet.partner.domain.entity.StaffAbsence;
import br.com.easypet.partner.domain.model.StaffStatus;
import br.com.easypet.partner.dto.request.StaffRequest;
import br.com.easypet.partner.dto.request.StaffScheduleRequest;
import br.com.easypet.partner.dto.request.StaffAbsenceRequest;
import br.com.easypet.partner.dto.response.StaffResponse;
import br.com.easypet.partner.dto.response.StaffScheduleResponse;
import br.com.easypet.partner.dto.response.StaffAbsenceResponse;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.mapper.StaffMapper;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.repository.ServiceOfferRepository;
import br.com.easypet.partner.repository.StaffRepository;
import br.com.easypet.partner.repository.StaffScheduleRepository;
import br.com.easypet.partner.repository.StaffAbsenceRepository;
import br.com.easypet.partner.security.PartnerAccess;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class StaffService {

    private final PartnerRepository partnerRepository;
    private final ServiceOfferRepository serviceOfferRepository;
    private final StaffRepository staffRepository;
    private final StaffScheduleRepository staffScheduleRepository;
    private final StaffAbsenceRepository staffAbsenceRepository;
    private final StaffMapper staffMapper;

    public void requirePartnerAccess(UUID partnerId) {
        PartnerAccess.requireOwnerOrAdmin(partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado")));
    }

    public void requireStaffAccess(UUID staffId) {
        requireStaffAccess(staffId, null);
    }

    public void requireStaffAccess(UUID staffId, UUID partnerId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado"));
        if (partnerId != null && !partnerId.equals(staff.getPartner().getId())) {
            throw new ResourceNotFoundException("Profissional não encontrado neste estabelecimento.");
        }
        PartnerAccess.requireOwnerOrAdmin(staff.getPartner());
    }

    public StaffResponse createStaff(UUID partnerId, StaffRequest request) {
        log.info("Cadastrando novo profissional '{}' no parceiro ID: {}", request.name(), partnerId);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Parceiro não encontrado com ID: " + partnerId));
        PartnerAccess.requireOwnerOrAdmin(partner);

        Staff staff = staffMapper.toEntity(request);
        staff.setPartner(partner);
        staff.setStatus(request.status() != null ? StaffStatus.valueOf(request.status()) : StaffStatus.ACTIVE);

        if (request.serviceIds() != null && !request.serviceIds().isEmpty()) {
            List<ServiceOffer> services = serviceOfferRepository.findAllById(request.serviceIds());
            validateServices(partner, services, new HashSet<>(request.serviceIds()).size());
            staff.setServices(new HashSet<>(services));
        } else {
            staff.setServices(new HashSet<>());
        }

        Staff savedStaff = staffRepository.save(staff);
        return staffMapper.toResponse(savedStaff);
    }

    @Transactional(readOnly = true)
    public List<StaffResponse> getStaffByPartnerId(UUID partnerId, StaffStatus status, UUID serviceId) {
        log.info("Buscando profissionais do parceiro ID: {}, status: {}, serviceId: {}", partnerId, status, serviceId);
        List<Staff> staffList;
        if (serviceId != null) {
            staffList = staffRepository.findByPartnerIdAndServicesIdAndStatus(partnerId, serviceId, status != null ? status : StaffStatus.ACTIVE);
            if (staffList.isEmpty()) {
                // Nenhum staff vinculado ao serviço: retorna todos os ativos do parceiro
                staffList = staffRepository.findByPartnerIdAndStatus(partnerId, status != null ? status : StaffStatus.ACTIVE);
            }
        } else if (status != null) {
            staffList = staffRepository.findByPartnerIdAndStatus(partnerId, status);
        } else {
            staffList = staffRepository.findByPartnerId(partnerId);
        }

        return staffList.stream()
                .map(staffMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffResponse getStaffById(UUID staffId) {
        log.info("Buscando profissional por ID: {}", staffId);
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado com ID: " + staffId));
        return staffMapper.toResponse(staff);
    }

    @Transactional
    public StaffResponse updateStaff(UUID staffId, StaffRequest request) {
        log.info("Atualizando profissional ID: {}", staffId);
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado com ID: " + staffId));
        PartnerAccess.requireOwnerOrAdmin(staff.getPartner());

        staffMapper.updateEntityFromRequest(request, staff);

        if (request.status() != null) {
            staff.setStatus(StaffStatus.valueOf(request.status()));
        }

        if (request.serviceIds() != null) {
            List<ServiceOffer> services = serviceOfferRepository.findAllById(request.serviceIds());
            validateServices(staff.getPartner(), services, new HashSet<>(request.serviceIds()).size());
            staff.setServices(new HashSet<>(services));
        }

        Staff updatedStaff = staffRepository.save(staff);
        return staffMapper.toResponse(updatedStaff);
    }

    public void deleteStaff(UUID staffId) {
        log.info("Desativando profissional ID: {}", staffId);
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado com ID: " + staffId));
        PartnerAccess.requireOwnerOrAdmin(staff.getPartner());
        
        // Em vez de exclusão física destrutiva, inativamos o profissional para manter histórico
        staff.setStatus(StaffStatus.INACTIVE);
        staffRepository.save(staff);
    }

    public List<StaffScheduleResponse> updateStaffSchedule(UUID staffId, List<StaffScheduleRequest> scheduleRequests) {
        log.info("Atualizando grade horária do profissional ID: {}", staffId);
        Staff staff = staffRepository.lockForSchedule(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado com ID: " + staffId));
        PartnerAccess.requireOwnerOrAdmin(staff.getPartner());

        if (scheduleRequests == null) throw OpeningHours.invalid();
        Set<Integer> days = new HashSet<>();
        for (var shift : scheduleRequests) {
            if (shift == null || shift.dayOfWeek() == null || shift.dayOfWeek() < 1
                    || shift.dayOfWeek() > 7 || !days.add(shift.dayOfWeek())) throw OpeningHours.invalid();
            OpeningHours.validatePeriod(shift.startTime(), shift.endTime(), shift.lunchStartTime(), shift.lunchEndTime());
        }

        // Limpa a grade horária anterior
        staffScheduleRepository.deleteByStaffId(staffId);

        if (scheduleRequests.isEmpty()) {
            return Collections.emptyList();
        }

        List<StaffSchedule> schedules = scheduleRequests.stream()
                .map(req -> {
                    StaffSchedule schedule = staffMapper.toEntity(req);
                    schedule.setStaff(staff);
                    return schedule;
                })
                .collect(Collectors.toList());

        List<StaffSchedule> savedSchedules = staffScheduleRepository.saveAll(schedules);
        return savedSchedules.stream()
                .map(staffMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StaffScheduleResponse> getStaffSchedule(UUID staffId) {
        log.info("Buscando grade horária do profissional ID: {}", staffId);
        List<StaffSchedule> schedules = staffScheduleRepository.findByStaffId(staffId);
        return schedules.stream()
                .map(staffMapper::toResponse)
                .collect(Collectors.toList());
    }

    public StaffAbsenceResponse createStaffAbsence(UUID staffId, StaffAbsenceRequest request) {
        log.info("Cadastrando ausência para o profissional ID: {}", staffId);
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado com ID: " + staffId));
        PartnerAccess.requireOwnerOrAdmin(staff.getPartner());
        if (!request.startDate().isBefore(request.endDate())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "O término do afastamento deve ser após o início.");
        }

        StaffAbsence absence = staffMapper.toEntity(request);
        absence.setStaff(staff);

        StaffAbsence savedAbsence = staffAbsenceRepository.save(absence);
        return staffMapper.toResponse(savedAbsence);
    }

    @Transactional(readOnly = true)
    public List<StaffAbsenceResponse> getStaffAbsences(UUID staffId) {
        log.info("Buscando ausências do profissional ID: {}", staffId);
        List<StaffAbsence> absences = staffAbsenceRepository.findByStaffId(staffId);
        return absences.stream()
                .map(staffMapper::toResponse)
                .collect(Collectors.toList());
    }

    private void validateServices(Partner partner, List<ServiceOffer> services, int requestedCount) {
        if (services.size() != requestedCount || services.stream()
                .anyMatch(service -> !service.getPartner().getId().equals(partner.getId()))) {
            throw new ResourceNotFoundException("Um ou mais serviços não pertencem a este estabelecimento.");
        }
    }
}
