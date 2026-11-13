package br.com.easypet.partner.security;

import br.com.easypet.partner.domain.entity.Partner;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class PartnerAccess {
    private PartnerAccess() {}

    public static void requireOwnerOrAdmin(Partner partner) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"))) {
            return;
        }
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal
                && partner.getUserId() != null && partner.getUserId().toString().equals(principal.id())
                && auth.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_PARTNER"))) {
            return;
        }
        throw new AccessDeniedException("Você não tem acesso a este estabelecimento.");
    }
}
