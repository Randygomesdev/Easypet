package br.com.easypet.booking.security;

import java.util.List;
import java.util.UUID;

public record BookingSession(UUID userId, String role, UUID partnerId, String accessRole, List<String> permissions, UUID teamAccessId) {
    public boolean hasPermission(String permission) {
        return "TEAM_MEMBER".equals(role) && permissions.contains(permission);
    }
}
