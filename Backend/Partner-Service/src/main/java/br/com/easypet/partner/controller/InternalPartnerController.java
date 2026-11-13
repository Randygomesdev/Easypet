package br.com.easypet.partner.controller;

import br.com.easypet.partner.dto.response.PartnerOperationsResponse;
import br.com.easypet.partner.service.PartnerService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@Hidden
@RequestMapping("/internal/partners")
@RequiredArgsConstructor
public class InternalPartnerController {
    private final PartnerService partners;

    @GetMapping("/{partnerId}/operations")
    public PartnerOperationsResponse findOperations(@PathVariable UUID partnerId) {
        return partners.findOperations(partnerId);
    }
}
