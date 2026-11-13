package br.com.innkercode.auth.dto.response;

import br.com.innkercode.auth.domain.entity.TeamAccess;
import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.TeamAccessRole;
import br.com.innkercode.auth.domain.model.UserRole;

import java.util.List;
import java.util.UUID;

public record SessionResponse(
        UUID userId, UserRole role, UUID partnerId, TeamAccessRole accessRole, List<String> permissions,
        UUID teamAccessId, String name
) {
    public static final String REQUEST_ATTRIBUTE = "auth.verifiedSession";

    public static SessionResponse from(User user) {
        return new SessionResponse(user.getId(), user.getRole(), null, null, List.of(), null, user.getName());
    }

    public static SessionResponse from(User user, TeamAccess access) {
        return new SessionResponse(user.getId(), user.getRole(), access.getPartnerId(),
                access.getAccessRole(), access.getAccessRole().permissions(), access.getId(), user.getName());
    }
}
