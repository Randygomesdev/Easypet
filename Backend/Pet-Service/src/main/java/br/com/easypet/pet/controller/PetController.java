package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.PetResponse;
import br.com.easypet.pet.service.PetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/pets")
@RequiredArgsConstructor
@Tag(name = "Pets", description = "Gerenciamento de pets dos usuários")
public class PetController {

    private final PetService petService;

    @PostMapping
    @Operation(summary = "Cadastrar um novo pet")
    public ResponseEntity<PetResponse> create(@Valid @RequestBody PetRequest request) {
        UUID userId = getCurrentUserId();
        PetResponse response = petService.create(userId, request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar todos os pets do usuário logado")
    public ResponseEntity<Page<PetResponse>> findAll(@ParameterObject Pageable pageable) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(petService.findAllByOwner(userId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar detalhes de um pet pelo ID")
    public ResponseEntity<PetResponse> findById(@PathVariable(name = "id") UUID id) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(petService.findById(userId, id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza as informações do Pet selecionado")
    public ResponseEntity<PetResponse> update(@PathVariable(name = "id") UUID id, @Valid @RequestBody PetRequest request) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(petService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deletar pet para o usuário logado")
    public ResponseEntity<Void> delete(@PathVariable(name = "id") UUID id){
        UUID userId = getCurrentUserId();
        petService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    private UUID getCurrentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getCredentials().toString());
    }
}
