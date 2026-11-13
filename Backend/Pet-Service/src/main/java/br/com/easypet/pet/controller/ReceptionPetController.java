package br.com.easypet.pet.controller;

import br.com.easypet.pet.dto.request.PetRequest;
import br.com.easypet.pet.dto.response.ReceptionPetResponse;
import br.com.easypet.pet.service.ReceptionPetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.UUID;

@RestController
@RequestMapping("/pets/reception/customers/{customerId}")
@RequiredArgsConstructor
public class ReceptionPetController {
    private final ReceptionPetService pets;

    @GetMapping
    public Page<ReceptionPetResponse> list(@PathVariable UUID customerId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(defaultValue = "") @Size(max = 255) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return pets.list(customerId, authorization, q, page, size);
    }

    @PostMapping
    public ResponseEntity<ReceptionPetResponse> create(@PathVariable UUID customerId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @Valid @RequestBody PetRequest request) {
        ReceptionPetResponse created = pets.create(customerId, authorization, request);
        return ResponseEntity.created(ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri()).body(created);
    }

    @GetMapping("/{petId}")
    public ReceptionPetResponse find(@PathVariable UUID customerId, @PathVariable UUID petId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return pets.find(customerId, authorization, petId);
    }
}
