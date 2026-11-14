package br.com.innkercode.auth.dto.request;

import jakarta.validation.constraints.Size;

public record RevokeTeamAccessRequest(@Size(max = 300) String reason) {}
