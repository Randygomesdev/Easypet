package br.com.easypet.partner.controller;

import br.com.easypet.partner.security.UserPrincipal;
import br.com.easypet.partner.service.CustomerClaimService;
import br.com.easypet.partner.service.ReceptionCustomerService.Membership;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CustomerClaimController {
    private final CustomerClaimService claims;

    @PostMapping("/partners/me/customers/{customerId}/claims")
    public ResponseEntity<CustomerClaimService.IssuedProof> issue(@AuthenticationPrincipal UserPrincipal actor,
            @PathVariable UUID customerId, @Valid @RequestBody IssueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(claims.issue(actor, customerId, request.userId()));
    }

    @PostMapping("/partners/customer-claims/redeem")
    public ResponseEntity<CustomerClaimService.ClaimedCustomer> redeem(@AuthenticationPrincipal UserPrincipal actor,
            @Valid @RequestBody RedeemRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(claims.redeem(actor, request.token()));
    }

    @Hidden
    @GetMapping("/internal/partners/customer-claims/me")
    public List<Membership> claimedCustomers(@AuthenticationPrincipal UserPrincipal actor) {
        return claims.claimedBy(actor);
    }

    public record IssueRequest(@NotNull UUID userId) {}
    public record RedeemRequest(@NotNull @Pattern(regexp = "[A-Za-z0-9_-]{43}") String token) {}
}
