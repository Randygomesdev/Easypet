package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.VaccineRequest;
import br.com.easypet.pet.dto.response.VaccineResponse;
import br.com.easypet.pet.service.VaccineService;
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
@RequestMapping("/pets/{petId}/vaccines")
@RequiredArgsConstructor
@Tag(name = "Vacinas", description = "Histórico de vacinação dos pets")
public class VaccineController {

    private final VaccineService vaccineService;

    @PostMapping
    @Operation(summary = "Registrar nova vacina para o pet")
    public ResponseEntity<VaccineResponse> create(@PathVariable(name = "petId") UUID petId, @Valid @RequestBody VaccineRequest request) {
        VaccineResponse response = vaccineService.create(petId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar histórico de vacinas do pet (paginado)")
    public ResponseEntity<Page<VaccineResponse>> findAll(@PathVariable(name = "petId") UUID petId, @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(vaccineService.findAllByPet(petId, pageable));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar dados de uma vacina")
    public ResponseEntity<VaccineResponse> update(@PathVariable(name = "petId") UUID petId,@PathVariable(name = "id") UUID id, @Valid @RequestBody VaccineRequest request) {
        return ResponseEntity.ok(vaccineService.update(petId, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir registro de vacina")
    public ResponseEntity<Void> delete(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id) {
        vaccineService.delete(petId, id);
        return ResponseEntity.ok().build();
    }
}
