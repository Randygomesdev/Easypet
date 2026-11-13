package br.com.easypet.partner.controller;

import br.com.easypet.partner.domain.model.PartnerCategory;
import br.com.easypet.partner.dto.response.PartnerResponse;
import br.com.easypet.partner.service.PartnerService;
import br.com.easypet.partner.service.PartnerAdministrationService;
import br.com.easypet.partner.domain.entity.PartnerStatusChange;
import br.com.easypet.partner.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/partners")
@RequiredArgsConstructor
@Tag(name = "Admin Partners", description = "Consultas administrativas de estabelecimentos")
public class AdminPartnerController {

    private final PartnerService partnerService;
    private final PartnerAdministrationService administration;

    @GetMapping
    public Page<PartnerResponse> findAll(
            @RequestParam(name = "category", required = false) PartnerCategory category,
            @RequestParam(name = "name", required = false) String name,
            @RequestParam(defaultValue = "true") boolean active,
            @ParameterObject Pageable pageable) {
        return administration.list(active, category, name, pageable);
    }

    @GetMapping("/{id}")
    public PartnerResponse findById(@PathVariable("id") UUID id) {
        return partnerService.findById(id);
    }

    @PatchMapping("/{id}/active")
    public PartnerResponse setActive(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal actor,
            @Valid @RequestBody ChangeStatus request) {
        return administration.setActive(id, UUID.fromString(actor.id()), request.active(), request.reason());
    }

    @GetMapping("/{id}/status-history")
    public Page<PartnerStatusChange> statusHistory(@PathVariable UUID id, @ParameterObject Pageable pageable) {
        return administration.history(id, pageable);
    }

    public record ChangeStatus(@NotNull Boolean active, @NotBlank @Size(max = 500) String reason) {}
}
