package br.com.easypet.payment.security;

import java.util.Set;
import java.util.UUID;

public record VerifiedSession(UUID userId, String role, UUID partnerId, String accessRole, Set<String> permissions) {
    private static final Set<String> ROLES = Set.of("ADMIN", "CUSTOMER", "PARTNER", "USER", "TEAM_MEMBER");
    private static final Set<String> ACCESS_ROLES = Set.of("MANAGER", "RECEPTION", "PROFESSIONAL");

    boolean isValid() {
        if (userId == null || role == null || !ROLES.contains(role) || permissions == null
                || permissions.stream().anyMatch(permission -> permission == null || permission.isBlank())) {
            return false;
        }
        return isTeamMember() ? partnerId != null && accessRole != null && ACCESS_ROLES.contains(accessRole)
                : partnerId == null && accessRole == null && permissions.isEmpty();
    }

    public boolean isTeamMember() {
        return "TEAM_MEMBER".equals(role);
    }

    public boolean canUseCashier(String permission) {
        return "PARTNER".equals(role) || (isTeamMember() && permissions.contains(permission));
    }
}
