package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.Staff;
import br.com.easypet.partner.domain.model.StaffStatus;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.repository.StaffRepository;
import br.com.easypet.partner.security.AuthSessionClient;
import br.com.easypet.partner.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffAssignmentService {
    private final DeskAccess desks;
    private final StaffRepository staff;
    private final AuthSessionClient auth;

    @Transactional
    public Assignment assign(UserPrincipal owner, UUID staffId, UUID userId, String bearer) {
        UUID partnerId = desks.activePartner(owner).getId();
        UUID accessId;
        try {
            accessId = auth.teamAccesses(bearer).stream().filter(access -> access.id() != null && userId.equals(access.userId())
                    && partnerId.equals(access.partnerId()) && "ACTIVE".equals(access.status())
                    && "PROFESSIONAL".equals(access.accessRole()))
                    .map(AuthSessionClient.TeamAccess::id).findFirst().orElseThrow(StaffAssignmentService::missing);
        } catch (HttpClientErrorException.Unauthorized rejected) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sua sessão expirou.");
        } catch (RestClientException | IllegalStateException failed) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Não foi possível verificar a equipe.");
        }
        Staff professional = staff.findByIdAndPartnerId(staffId, partnerId)
                .filter(found -> found.getStatus() == StaffStatus.ACTIVE).orElseThrow(StaffAssignmentService::missing);
        if (professional.getTeamAccessId() != null && !accessId.equals(professional.getTeamAccessId())) throw conflict();
        professional.setTeamUserId(userId);
        professional.setTeamAccessId(accessId);
        try {
            staff.saveAndFlush(professional);
        } catch (DataIntegrityViolationException duplicate) {
            throw conflict();
        }
        return new Assignment(partnerId, userId, staffId, accessId);
    }

    @Transactional
    public void unlink(UserPrincipal owner, UUID staffId) {
        UUID partnerId = desks.activePartner(owner).getId();
        Staff professional = staff.findByIdAndPartnerId(staffId, partnerId).orElseThrow(StaffAssignmentService::missing);
        professional.setTeamUserId(null);
        professional.setTeamAccessId(null);
    }

    @Transactional(readOnly = true)
    public Assignment resolve(UserPrincipal actor) {
        UUID partnerId = desks.activePartner(actor).getId();
        UUID userId = UUID.fromString(actor.id());
        return staff.findByPartnerIdAndTeamUserIdAndTeamAccessIdAndStatus(
                        partnerId, userId, actor.teamAccessId(), StaffStatus.ACTIVE)
                .map(person -> new Assignment(partnerId, userId, person.getId(), actor.teamAccessId()))
                .orElseThrow(StaffAssignmentService::missing);
    }

    @Transactional(readOnly = true)
    public List<Assignment> list(UserPrincipal owner) {
        UUID partnerId = desks.activePartner(owner).getId();
        return staff.findByPartnerIdAndTeamAccessIdIsNotNullOrderByNameAscIdAsc(partnerId).stream()
                .map(person -> new Assignment(partnerId, person.getTeamUserId(), person.getId(), person.getTeamAccessId()))
                .toList();
    }

    private static ResourceNotFoundException missing() {
        return new ResourceNotFoundException("Vínculo de profissional indisponível neste estabelecimento.");
    }

    private static ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "A conta ou o profissional já tem vínculo. Desvincule antes de alterar.");
    }

    public record Assignment(UUID partnerId, UUID userId, UUID staffId, UUID teamAccessId) {}
}
