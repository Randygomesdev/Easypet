package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcceptTeamInvitationRequest(
        @NotBlank @Size(max = 255) String token,
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(min = 6) String password
) {}
