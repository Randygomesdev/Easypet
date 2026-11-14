package br.com.innkercode.auth.dto.response;

import br.com.innkercode.auth.domain.entity.IdentityAuditEvent;
import br.com.innkercode.auth.domain.model.IdentityAuditAction;
import br.com.innkercode.auth.domain.model.IdentityAuditTarget;
import br.com.innkercode.auth.domain.model.TeamAccessRole;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;
import br.com.innkercode.auth.domain.model.UserRole;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.UUID;

public record IdentityAuditResponse(
        UUID id, Instant occurredAt, UUID actorId, UserRole actorRole,
        IdentityAuditTarget targetType, UUID targetId, UUID targetUserId, UUID partnerId,
        IdentityAuditAction action, State before, State after, String reason
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record State(Boolean active, TeamAccessStatus status, TeamAccessRole accessRole) {}

    public static IdentityAuditResponse from(IdentityAuditEvent event) {
        State before;
        State after;
        if (event.getTargetType() == IdentityAuditTarget.CUSTOMER) {
            before = new State(event.getBeforeActive(), null, null);
            after = new State(event.getAfterActive(), null, null);
        } else {
            before = event.getBeforeStatus() == null ? null
                    : new State(null, event.getBeforeStatus(), event.getAccessRole());
            after = new State(null, event.getAfterStatus(), event.getAccessRole());
        }
        return new IdentityAuditResponse(event.getId(), event.getOccurredAt(), event.getActorId(),
                event.getActorRole(), event.getTargetType(), event.getTargetId(), event.getTargetUserId(),
                event.getPartnerId(), event.getAction(), before, after, event.getReason());
    }
}
