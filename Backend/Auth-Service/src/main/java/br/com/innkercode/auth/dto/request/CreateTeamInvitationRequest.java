package br.com.innkercode.auth.dto.request;

import br.com.innkercode.auth.domain.model.TeamAccessRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTeamInvitationRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotNull TeamAccessRole accessRole
) {}
