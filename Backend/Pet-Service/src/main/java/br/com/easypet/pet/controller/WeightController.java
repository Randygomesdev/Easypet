package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.WeightRecordRequest;
import br.com.easypet.pet.dto.response.WeightRecordResponse;
import br.com.easypet.pet.service.WeightRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/pets/{petId}/weights")
@RequiredArgsConstructor
@Tag(name = "Pesos", description = "Histórico de pesagem dos pets")
public class WeightController {

    private final WeightRecordService weightRecordService;

    @PostMapping
    @Operation(summary = "Registrar novo peso")
    public ResponseEntity<WeightRecordResponse> create(@PathVariable(name = "petId") UUID petId, @Valid @RequestBody WeightRecordRequest request) {
        WeightRecordResponse response = weightRecordService.create(petId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar histórico de pesos dos pets (Paginado)")
    public ResponseEntity<Page<WeightRecordResponse>> findAll(@PathVariable(name = "petId") UUID petId, Pageable pageable) {
        return ResponseEntity.ok(weightRecordService.findAllByPet(petId, pageable));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir registro de peso dos pets")
    public ResponseEntity<Void> delete(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id) {
        weightRecordService.delete(petId, id);
        return ResponseEntity.ok().build();
    }
}
