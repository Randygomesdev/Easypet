package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.ExamRequest;
import br.com.easypet.pet.dto.response.ExamResponse;
import br.com.easypet.pet.service.ExamService;
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
@RequestMapping("/pets/{petId}/exams")
@RequiredArgsConstructor
@Tag(name = "Exames", description = "Histórico de exames dos pets")
public class ExamController {

    private final ExamService examService;

    @PostMapping
    @Operation(summary = "Registrar um novo exame")
    public ResponseEntity<ExamResponse> create(@PathVariable(name = "petId") UUID petId, @Valid @RequestBody ExamRequest request) {
        ExamResponse response = examService.create(petId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar histórico de exames (paginado)")
    public ResponseEntity<Page<ExamResponse>> findAll(@PathVariable(name = "petId") UUID petId, @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(examService.findAllByPet(petId, pageable));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar dados de um exame")
    public ResponseEntity<ExamResponse> update(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id, @Valid @RequestBody ExamRequest request) {
        return ResponseEntity.ok(examService.update(petId, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remover registro de exame")
    public ResponseEntity<Void> delete(@PathVariable(name = "petId") UUID petId, @PathVariable(name = "id") UUID id) {
        examService.delete(petId, id);
        return ResponseEntity.ok().build();
    }
}
