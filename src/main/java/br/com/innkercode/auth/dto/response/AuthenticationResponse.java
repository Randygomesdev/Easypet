package br.com.innkercode.auth.dto.response;

import java.util.UUID;

public record AuthenticationResponse(
        String token,
        UUID id,
        String name,
        String email,
        String role,
        String pictureUrl
) {}
