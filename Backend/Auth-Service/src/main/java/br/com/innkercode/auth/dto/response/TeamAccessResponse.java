package br.com.innkercode.auth.dto.response;

import br.com.innkercode.auth.domain.entity.TeamAccess;
import br.com.innkercode.auth.domain.model.TeamAccessRole;
import br.com.innkercode.auth.domain.model.TeamAccessStatus;

import java.time.Instant;
import java.util.UUID;

public record TeamAccessResponse(
        UUID id, UUID partnerId, String email, TeamAccessRole accessRole, TeamAccessStatus status, Instant expiresAt,
        UUID userId
) {
    public static TeamAccessResponse from(TeamAccess access, Instant now) {
        return new TeamAccessResponse(access.getId(), access.getPartnerId(), access.getEmail(),
                access.getAccessRole(), access.statusAt(now), access.getExpiresAt(),
                access.getStatus() == TeamAccessStatus.ACTIVE ? access.getUserId() : null);
    }
}
