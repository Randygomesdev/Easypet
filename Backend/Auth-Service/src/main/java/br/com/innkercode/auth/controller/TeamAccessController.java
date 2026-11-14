package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.dto.request.AcceptTeamInvitationRequest;
import br.com.innkercode.auth.dto.request.CreateTeamInvitationRequest;
import br.com.innkercode.auth.dto.request.RevokeTeamAccessRequest;
import br.com.innkercode.auth.dto.response.TeamAccessResponse;
import br.com.innkercode.auth.service.PartnerOwnershipClient;
import br.com.innkercode.auth.service.TeamAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/auth/team")
@RequiredArgsConstructor
public class TeamAccessController {

    private final TeamAccessService team;
    private final PartnerOwnershipClient partnerOwnership;

    @PostMapping("/invitations")
    @PreAuthorize("hasRole('PARTNER')")
    @ResponseStatus(HttpStatus.CREATED)
    public TeamAccessResponse invite(
            @AuthenticationPrincipal User user,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @Valid @RequestBody CreateTeamInvitationRequest request) {
        UUID partnerId = partnerOwnership.requireOwnedPartner(authorization);
        return team.invite(user.getId(), partnerId, request);
    }

    @PostMapping("/invitations/accept")
    public TeamAccessResponse accept(@Valid @RequestBody AcceptTeamInvitationRequest request) {
        return team.accept(request);
    }

    @GetMapping("/accesses")
    @PreAuthorize("hasRole('PARTNER')")
    public List<TeamAccessResponse> list(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return team.list(partnerOwnership.requireOwnedPartner(authorization));
    }

    @DeleteMapping("/accesses/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(
            @AuthenticationPrincipal User user,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) RevokeTeamAccessRequest request) {
        team.revoke(user.getId(), partnerOwnership.requireOwnedPartner(authorization), id,
                request == null ? null : request.reason());
    }
}
