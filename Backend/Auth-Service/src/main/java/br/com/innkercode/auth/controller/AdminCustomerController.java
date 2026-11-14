package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.dto.request.SetCustomerActiveRequest;
import br.com.innkercode.auth.dto.response.AdminCustomerResponse;
import br.com.innkercode.auth.dto.response.CustomerPageResponse;
import br.com.innkercode.auth.service.AdminCustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/customers")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminCustomerController {

    private final AdminCustomerService customers;

    @GetMapping
    public CustomerPageResponse list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Boolean active) {
        return customers.search(page, size, q, active);
    }

    @PatchMapping("/{id}/active")
    public AdminCustomerResponse setActive(@AuthenticationPrincipal User actor, @PathVariable UUID id,
                                           @Valid @RequestBody SetCustomerActiveRequest request) {
        return customers.setActive(actor, id, request.active(), request.reason());
    }
}
