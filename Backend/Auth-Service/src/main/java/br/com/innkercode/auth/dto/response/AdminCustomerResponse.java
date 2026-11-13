package br.com.innkercode.auth.dto.response;

import br.com.innkercode.auth.domain.entity.User;

import java.util.UUID;

public record AdminCustomerResponse(UUID id, String name, String email, boolean active) {

    public static AdminCustomerResponse from(User user) {
        return new AdminCustomerResponse(user.getId(), user.getName(), user.getEmail(), user.isEnabled());
    }
}
