package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.MedicationRequest;
import br.com.easypet.pet.dto.response.MedicationResponse;
import br.com.easypet.pet.service.MedicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/pets/{petId}/medications")
@RequiredArgsConstructor
@Tag(name = "Medicamentos", description = "Gerenciamento de medicamentos e prescrições")
public class MedicationController {

    private final MedicationService medicationService;

    @PostMapping
    @Operation(summary = "Registrar um novo medicamento")
    public ResponseEntity<MedicationResponse> create(@PathVariable(name = "petId") UUID petId, @Valid @RequestBody MedicationRequest request) {
        MedicationResponse response = medicationService.create(petId, request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar todos os medicamentos do pet")
    public ResponseEntity<List<MedicationResponse>> findAll(@PathVariable(name = "petId") UUID petId) {
        return ResponseEntity.ok(medicationService.findAllByPet(petId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar dados de um medicamento")
    public ResponseEntity<MedicationResponse> update(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id, @Valid @RequestBody MedicationRequest request) {
        return ResponseEntity.ok(medicationService.update(petId, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remover registro de medicamento")
    public ResponseEntity<Void> delete(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id) {
        medicationService.delete(petId, id);
        return ResponseEntity.noContent().build();
    }
}
