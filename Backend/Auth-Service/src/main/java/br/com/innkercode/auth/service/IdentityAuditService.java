package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.IdentityAuditEvent;
import br.com.innkercode.auth.domain.entity.TeamAccess;
import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.IdentityAuditAction;
import br.com.innkercode.auth.domain.model.IdentityAuditTarget;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.response.IdentityAuditPageResponse;
import br.com.innkercode.auth.dto.response.IdentityAuditResponse;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.repository.IdentityAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IdentityAuditService {

    private static final String UNSPECIFIED = "Motivo não informado.";
    private static final String ACCEPTED_BY_RECIPIENT = "Convite aceito pelo destinatário.";

    private final IdentityAuditRepository events;

    @Transactional(propagation = Propagation.MANDATORY)
    public void customerActiveChanged(User actor, User customer, boolean previousActive, String reason) {
        events.save(IdentityAuditEvent.builder()
                .occurredAt(Instant.now())
                .actorId(actor.getId())
                .actorRole(actor.getRole())
                .targetType(IdentityAuditTarget.CUSTOMER)
                .targetId(customer.getId())
                .targetUserId(customer.getId())
                .action(customer.isEnabled() ? IdentityAuditAction.CUSTOMER_ACTIVATED : IdentityAuditAction.CUSTOMER_DEACTIVATED)
                .beforeActive(previousActive)
                .afterActive(customer.isEnabled())
                .reason(normalizeReason(reason))
                .build());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void teamInvited(UUID ownerId, TeamAccess access, String reason, Instant occurredAt) {
        recordTeam(ownerId, UserRole.PARTNER, access, IdentityAuditAction.TEAM_INVITED, null, reason, occurredAt);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void teamAccepted(User member, TeamAccess access, Instant occurredAt) {
        recordTeam(member.getId(), member.getRole(), access, IdentityAuditAction.TEAM_INVITATION_ACCEPTED,
                TeamAccessStatus.PENDING, ACCEPTED_BY_RECIPIENT, occurredAt);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void teamRevoked(UUID ownerId, TeamAccess access, TeamAccessStatus previous, String reason, Instant occurredAt) {
        recordTeam(ownerId, UserRole.PARTNER, access, IdentityAuditAction.TEAM_ACCESS_REVOKED, previous, reason, occurredAt);
    }

    private void recordTeam(UUID actorId, UserRole actorRole, TeamAccess access, IdentityAuditAction action,
                            TeamAccessStatus previous, String reason, Instant occurredAt) {
        events.save(IdentityAuditEvent.builder()
                .occurredAt(occurredAt)
                .actorId(actorId)
                .actorRole(actorRole)
                .targetType(IdentityAuditTarget.TEAM_ACCESS)
                .targetId(access.getId())
                .targetUserId(access.getUserId())
                .partnerId(access.getPartnerId())
                .action(action)
                .beforeStatus(previous)
                .afterStatus(access.getStatus())
                .accessRole(access.getAccessRole())
                .reason(normalizeReason(reason))
                .build());
    }

    @Transactional(readOnly = true)
    public IdentityAuditPageResponse search(IdentityAuditTarget targetType, UUID targetId, UUID actorId, UUID partnerId,
                                            IdentityAuditAction action, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AUDIT_PAGINATION", "Paginação de auditoria inválida.");
        }
        var filter = Specification.allOf(
                equalIfProvided("targetType", targetType),
                equalIfProvided("targetId", targetId),
                equalIfProvided("actorId", actorId),
                equalIfProvided("partnerId", partnerId),
                equalIfProvided("action", action));
        var pagination = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt", "id"));
        return IdentityAuditPageResponse.from(events.findAll(filter, pagination).map(IdentityAuditResponse::from));
    }

    private static Specification<IdentityAuditEvent> equalIfProvided(String property, Object value) {
        return (root, query, builder) -> value == null ? null : builder.equal(root.get(property), value);
    }

    private static String normalizeReason(String reason) {
        return reason == null || reason.isBlank() ? UNSPECIFIED : reason.strip();
    }
}
