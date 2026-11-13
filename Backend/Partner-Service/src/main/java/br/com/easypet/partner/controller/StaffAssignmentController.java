package br.com.easypet.partner.controller;

import br.com.easypet.partner.security.UserPrincipal;
import br.com.easypet.partner.service.StaffAssignmentService;
import br.com.easypet.partner.service.StaffAssignmentService.Assignment;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class StaffAssignmentController {
    private final StaffAssignmentService assignments;

    @GetMapping("/partners/me/staff/team-members")
    public List<Assignment> list(@AuthenticationPrincipal UserPrincipal actor) {
        return assignments.list(actor);
    }

    @PutMapping("/partners/me/staff/{staffId}/team-member")
    public Assignment assign(@AuthenticationPrincipal UserPrincipal actor, @PathVariable UUID staffId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String bearer, @Valid @RequestBody AssignRequest request) {
        return assignments.assign(actor, staffId, request.userId(), bearer);
    }

    @DeleteMapping("/partners/me/staff/{staffId}/team-member")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlink(@AuthenticationPrincipal UserPrincipal actor, @PathVariable UUID staffId) {
        assignments.unlink(actor, staffId);
    }

    @Hidden
    @GetMapping("/internal/partners/me/staff-assignment")
    public Assignment resolve(@AuthenticationPrincipal UserPrincipal actor) {
        return assignments.resolve(actor);
    }

    public record AssignRequest(@NotNull UUID userId) {}
}
