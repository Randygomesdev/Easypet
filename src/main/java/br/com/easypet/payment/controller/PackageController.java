package br.com.easypet.payment.controller;

import br.com.easypet.payment.dto.request.CreditConsumeRequest;
import br.com.easypet.payment.dto.request.PackageTemplateRequest;
import br.com.easypet.payment.dto.response.CreditConsumeResponse;
import br.com.easypet.payment.dto.response.CustomerPackageResponse;
import br.com.easypet.payment.dto.response.PackageTemplateResponse;
import br.com.easypet.payment.service.PackageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/payments/packages")
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Packages & Recurrence", description = "Endpoints para criação de modelos, compras e consumo de créditos de pacotes do EasyPet")
public class PackageController {

    private final PackageService packageService;

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @Operation(summary = "Criar modelo de pacote promocional", description = "Cria um novo template de pacote associado a um serviço. Requer privilégios de ADMIN, PARTNER ou PARTNER.")
    public ResponseEntity<PackageTemplateResponse> createTemplate(@Valid @RequestBody PackageTemplateRequest request) {
        log.info("Requisição para criar template de pacote '{}' pelo parceiro {}", request.name(), request.partnerId());
        PackageTemplateResponse response = packageService.createTemplate(request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping("/templates/partner/{partnerId}")
    @Operation(summary = "Listar modelos de pacotes ativos do parceiro", description = "Retorna todos os templates de pacotes que estão ativos e disponíveis para compra em um parceiro.")
    public ResponseEntity<List<PackageTemplateResponse>> getTemplatesByPartner(@PathVariable("partnerId") UUID partnerId) {
        log.info("Requisição para buscar templates ativos do parceiro: {}", partnerId);
        List<PackageTemplateResponse> response = packageService.getTemplatesByPartner(partnerId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/templates/{templateId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @Operation(summary = "Atualizar modelo de pacote promocional", description = "Atualiza os dados de um modelo de pacote promocional existente. Requer privilégios de ADMIN, PARTNER ou PARTNER.")
    public ResponseEntity<PackageTemplateResponse> updateTemplate(@PathVariable("templateId") UUID templateId, @Valid @RequestBody PackageTemplateRequest request) {
        log.info("Requisição para atualizar template de pacote ID: {}", templateId);
        PackageTemplateResponse response = packageService.updateTemplate(templateId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/templates/{templateId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @Operation(summary = "Excluir modelo de pacote promocional", description = "Realiza a exclusão lógica (soft delete) de um modelo de pacote promocional. Requer privilégios de ADMIN, PARTNER ou PARTNER.")
    public ResponseEntity<Void> deleteTemplate(@PathVariable("templateId") UUID templateId) {
        log.info("Requisição para excluir template de pacote ID: {}", templateId);
        packageService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/purchase/{templateId}")
    @Operation(summary = "Adquirir um pacote promocional", description = "Compra um modelo de pacote simulando a transação financeira e gerando os créditos de saldo para o cliente autenticado via JWT.")
    public ResponseEntity<CustomerPackageResponse> purchasePackage(@PathVariable("templateId") UUID templateId) {
        UUID currentUserId = getCurrentUserId();
        log.info("Requisição do usuário {} para adquirir o pacote template: {}", currentUserId, templateId);
        CustomerPackageResponse response = packageService.purchasePackage(templateId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-balances")
    @Operation(summary = "Listar saldos de créditos ativos do tutor", description = "Retorna todos os pacotes comprados e com saldos de créditos ativos do tutor logado via JWT (com limpeza e expiração on-the-fly).")
    public ResponseEntity<List<CustomerPackageResponse>> getMyActivePackages() {
        UUID currentUserId = getCurrentUserId();
        log.info("Requisição do usuário {} para buscar seus saldos de pacotes ativos", currentUserId);
        List<CustomerPackageResponse> response = packageService.getMyActivePackages(currentUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/consume")
    @Operation(summary = "Consumir crédito de pacote síncrono", description = "Valida e consome 1 crédito de um pacote válido do usuário. Chamado via REST síncrono pelo microserviço booking-service.")
    public ResponseEntity<CreditConsumeResponse> consumeCredit(@Valid @RequestBody CreditConsumeRequest request) {
        log.info("Chamada interna do booking-service para consumo de crédito do usuário: {}", request.userId());
        CreditConsumeResponse response = packageService.consumeCredit(request);
        return ResponseEntity.ok(response);
    }

    private UUID getCurrentUserId() {
        Object credentials = SecurityContextHolder.getContext().getAuthentication().getCredentials();
        if (credentials == null) {
            throw new br.com.easypet.payment.exception.BusinessException("Usuário não autenticado no Payment Service.");
        }
        return UUID.fromString((String) credentials);
    }
}
