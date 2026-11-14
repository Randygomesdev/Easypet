package br.com.easypet.partner.controller;

import br.com.easypet.partner.domain.model.PartnerCategory;
import br.com.easypet.partner.dto.request.PartnerRequest;
import br.com.easypet.partner.dto.request.ServiceOfferRequest;
import br.com.easypet.partner.dto.response.PartnerResponse;
import br.com.easypet.partner.dto.response.CatalogPartnerResponse;
import br.com.easypet.partner.dto.response.ReviewResponse;
import br.com.easypet.partner.dto.response.ServiceResponse;
import br.com.easypet.partner.dto.request.ReviewRequest;
import br.com.easypet.partner.service.PartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/partners")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Partners", description = "Endpoints para gestão de parceiros e marketplace")
public class PartnerController {

    private final PartnerService partnerService;

    @GetMapping("/me")
    @Operation(summary = "Buscar meu perfil de parceiro", description = "Retorna o perfil do parceiro vinculado ao usuário autenticado.")
    public ResponseEntity<PartnerResponse> findMe() {
        return ResponseEntity.ok(partnerService.findByCurrentUser());
    }

    @PutMapping("/me")
    @Operation(summary = "Atualizar meu perfil de parceiro", description = "Atualiza os dados do parceiro vinculado ao usuário autenticado.")
    public ResponseEntity<PartnerResponse> updateMe(@Valid @RequestBody PartnerRequest request) {
        PartnerResponse current = partnerService.findByCurrentUser();
        return ResponseEntity.ok(partnerService.update(current.id(), request));
    }

    @PostMapping
    @Operation(summary = "Cadastrar um novo parceiro", description = "Cria um novo parceiro no marketplace. Requer autenticação.")
    public ResponseEntity<PartnerResponse> create(@Valid @RequestBody PartnerRequest request) {
        log.info("Recebida requisição para cadastro de novo parceiro: {}", request.name());
        PartnerResponse response = partnerService.create(request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar todos os parceiros", description = "Consulta administrativa paginada dos parceiros ativos. Pode ser filtrada por categoria ou nome.")
    public ResponseEntity<Page<PartnerResponse>> findAll(
            @RequestParam(name = "category", required = false) PartnerCategory category,
            @RequestParam(name = "name", required = false) String name,
            @org.springdoc.core.annotations.ParameterObject Pageable pageable) {
        log.info("Requisição recebida em PartnerController.findAll - Page: {}, Size: {}", pageable.getPageNumber(), pageable.getPageSize());
        return ResponseEntity.ok(partnerService.findAll(category, name, pageable));
    }

    @GetMapping("/catalog")
    public ResponseEntity<Page<CatalogPartnerResponse>> catalog(
            @RequestParam(required = false) PartnerCategory category,
            @RequestParam(required = false) String name, Pageable pageable) {
        return ResponseEntity.ok(partnerService.findCatalog(category, name, pageable));
    }

    @GetMapping("/catalog/{id}")
    public ResponseEntity<CatalogPartnerResponse> catalogDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(CatalogPartnerResponse.from(partnerService.findActiveById(id)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar parceiro por ID", description = "Consulta completa para o titular do estabelecimento ou administrador.")
    public ResponseEntity<PartnerResponse> findById(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(partnerService.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar um parceiro", description = "Atualiza os dados de um parceiro existente. Requer autenticação.")
    public ResponseEntity<PartnerResponse> update(
            @PathVariable(name = "id") UUID id,
            @Valid @RequestBody PartnerRequest request) {
        log.info("Recebida requisição PUT para atualizar parceiro ID: {} - Nome: {}", id, request.name());
        return ResponseEntity.ok(partnerService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Rota legada de desativação", description = "A alteração de situação exige motivo e auditoria administrativa.")
    public ResponseEntity<Void> delete(@PathVariable(name = "id") UUID id) {
        partnerService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/services")
    @Operation(summary = "Adicionar serviço ao parceiro", description = "Cadastra um novo serviço para um parceiro específico.")
    public ResponseEntity<ServiceResponse> addService(
            @PathVariable(name = "id") UUID id,
            @Valid @RequestBody ServiceOfferRequest request) {
        return ResponseEntity.ok(partnerService.addService(id, request));
    }

    @PutMapping("/{id}/services/{serviceId}")
    @Operation(summary = "Atualizar serviço do parceiro", description = "Atualiza um serviço específico e vincula colaboradores.")
    public ResponseEntity<ServiceResponse> updateService(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "serviceId") UUID serviceId,
            @Valid @RequestBody ServiceOfferRequest request) {
        return ResponseEntity.ok(partnerService.updateService(id, serviceId, request));
    }

    @PostMapping("/{id}/reviews")
    @Operation(summary = "Adicionar avaliação ao parceiro", description = "Cadastra uma nova avaliação/comentário para um parceiro e recalcula sua nota média.")
    public ResponseEntity<ReviewResponse> addReview(
            @PathVariable(name = "id") UUID id,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(partnerService.addReview(id, request));
    }

    @GetMapping("/{id}/reviews")
    @Operation(summary = "Listar avaliações de um parceiro", description = "Retorna a lista de avaliações de um parceiro ordenada por data mais recente.")
    public ResponseEntity<List<ReviewResponse>> findReviewsByPartnerId(
            @PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(partnerService.findReviewsByPartnerId(id));
    }
}
