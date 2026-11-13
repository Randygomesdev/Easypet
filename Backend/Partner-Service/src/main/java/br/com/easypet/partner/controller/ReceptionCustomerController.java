package br.com.easypet.partner.controller;

import br.com.easypet.partner.dto.request.ReceptionCustomerRequest;
import br.com.easypet.partner.dto.response.ReceptionCustomerResponse;
import br.com.easypet.partner.security.UserPrincipal;
import br.com.easypet.partner.service.ReceptionCustomerService;
import br.com.easypet.partner.service.DeskAccess;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReceptionCustomerController {
    private static final String PARTNER = "/partners/me/customers";
    private static final String ADMIN = "/admin/reception-customers";
    private final ReceptionCustomerService customers;
    private final DeskAccess deskAccess;

    @GetMapping("/partners/me/desk")
    public DeskContext deskContext(@AuthenticationPrincipal UserPrincipal actor) {
        return new DeskContext(deskAccess.activePartner(actor).getId());
    }

    @PostMapping(PARTNER)
    public ResponseEntity<ReceptionCustomerResponse> create(@AuthenticationPrincipal UserPrincipal actor,
            @Valid @RequestBody ReceptionCustomerRequest request) {
        ReceptionCustomerResponse created = customers.create(actor, request);
        return ResponseEntity.created(ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri()).body(created);
    }

    @GetMapping(PARTNER)
    public Page<ReceptionCustomerResponse> listForPartner(@AuthenticationPrincipal UserPrincipal actor,
            @RequestParam(defaultValue = "") @Size(max = 254) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return customers.listForPartner(actor, q, page, size);
    }

    @GetMapping(PARTNER + "/{customerId}")
    public ReceptionCustomerResponse findForPartner(@AuthenticationPrincipal UserPrincipal actor,
            @PathVariable UUID customerId) {
        return customers.findForPartner(actor, customerId);
    }

    @GetMapping(ADMIN)
    public Page<ReceptionCustomerResponse> listForAdmin(
            @RequestParam(defaultValue = "") @Size(max = 254) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return customers.listForAdmin(q, page, size);
    }

    @GetMapping(ADMIN + "/{customerId}")
    public ReceptionCustomerResponse findForAdmin(@PathVariable UUID customerId) {
        return customers.findForAdmin(customerId);
    }

    @Hidden
    @GetMapping("/internal" + PARTNER + "/{customerId}/membership")
    public ReceptionCustomerService.Membership membership(@AuthenticationPrincipal UserPrincipal actor,
            @PathVariable UUID customerId) {
        return customers.membership(actor, customerId);
    }

    public record DeskContext(UUID partnerId) {}
}
