package br.com.easypet.partner.security;

import java.security.Principal;
import java.util.UUID;

public record UserPrincipal(String id, String email, String name, UUID partnerId, UUID teamAccessId) implements Principal {
    public UserPrincipal(String id, String email, String name) {
        this(id, email, name, null, null);
    }
    @Override
    public String getName() {
        return name;
    }
}
