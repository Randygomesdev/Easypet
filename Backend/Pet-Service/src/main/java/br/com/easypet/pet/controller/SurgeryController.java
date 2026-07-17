package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.SurgeryRequest;
import br.com.easypet.pet.dto.response.SurgeryResponse;
import br.com.easypet.pet.service.SurgeryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/pets/{petId}/surgeries")
@RequiredArgsConstructor
@Tag(name = "Cirurgias", description = "Histórico de cirurgias dos pets")
public class SurgeryController {

    private final SurgeryService surgeryService;

    @PostMapping
    @Operation(summary = "Registrar uma nova cirurgia")
    public ResponseEntity<SurgeryResponse> create(@PathVariable(name = "petId") UUID petId, @Valid @RequestBody SurgeryRequest request) {
        SurgeryResponse response = surgeryService.create(petId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar histórico de cirurgias (paginado)")
    public ResponseEntity<Page<SurgeryResponse>> findAll(@PathVariable(name = "petId") UUID petId, @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(surgeryService.findAllByPet(petId, pageable));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar dados de uma cirurgia")
    public ResponseEntity<SurgeryResponse> update(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id, @Valid @RequestBody SurgeryRequest request) {
        return ResponseEntity.ok(surgeryService.update(petId, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remover registro de cirurgia")
    public ResponseEntity<Void> delete(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id) {
        surgeryService.delete(petId, id);
        return ResponseEntity.ok().build();
    }
}
