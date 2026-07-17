package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.response.PetHistoryResponse;
import br.com.easypet.pet.service.PetHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/pets/{petId}/history")
@RequiredArgsConstructor
@Tag(name = "Prontuário", description = "Histórico completo de saúde do pet")
public class PetHistoryController {

    private final PetHistoryService petHistoryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @Operation(summary = "Prontuário completo", description = "Retorna consultas, medicamentos, exames e vacinas do pet em uma única chamada.")
    public ResponseEntity<PetHistoryResponse> getHistory(@PathVariable UUID petId) {
        return ResponseEntity.ok(petHistoryService.getHistory(petId));
    }
}
