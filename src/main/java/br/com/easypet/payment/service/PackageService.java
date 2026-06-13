package br.com.easypet.payment.service;

import br.com.easypet.payment.client.PartnerServiceClient;
import br.com.easypet.payment.client.dto.PartnerResponseDto;
import br.com.easypet.payment.domain.entity.CustomerPackage;
import br.com.easypet.payment.domain.entity.PackageTemplate;
import br.com.easypet.payment.domain.entity.PaymentTransaction;
import br.com.easypet.payment.domain.enums.CustomerPackageStatus;
import br.com.easypet.payment.domain.enums.PaymentMethod;
import br.com.easypet.payment.dto.request.CreditConsumeRequest;
import br.com.easypet.payment.dto.request.PackageTemplateRequest;
import br.com.easypet.payment.dto.response.CreditConsumeResponse;
import br.com.easypet.payment.dto.response.CustomerPackageResponse;
import br.com.easypet.payment.dto.response.PackageTemplateResponse;
import br.com.easypet.payment.exception.BusinessException;
import br.com.easypet.payment.exception.ResourceNotFoundException;
import br.com.easypet.payment.mapper.PackageMapper;
import br.com.easypet.payment.repository.CustomerPackageRepository;
import br.com.easypet.payment.repository.PackageTemplateRepository;
import br.com.easypet.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PackageService {

    private final PackageTemplateRepository packageTemplateRepository;
    private final CustomerPackageRepository customerPackageRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PackageMapper packageMapper;
    private final PartnerServiceClient partnerServiceClient;

    public PackageTemplateResponse createTemplate(PackageTemplateRequest request) {
        log.info("Iniciando criação de modelo de pacote '{}' para o parceiro {}", request.name(), request.partnerId());

        // Validar se o parceiro e o serviço existem no partner-service
        PartnerResponseDto partnerDto = partnerServiceClient.getPartnerById(request.partnerId());
        if (partnerDto == null) {
            throw new ResourceNotFoundException("Parceiro não encontrado com o ID fornecido.");
        }

        boolean serviceExists = partnerDto.services() != null && partnerDto.services().stream()
                .anyMatch(s -> s.id() != null && s.id().equals(request.serviceId()));

        if (!serviceExists) {
            throw new ResourceNotFoundException("O serviço informado não está associado ao parceiro selecionado.");
        }

        PackageTemplate template = packageMapper.toEntity(request);
        template.setIsActive(true);

        PackageTemplate saved = packageTemplateRepository.save(template);
        log.info("Modelo de pacote criado com sucesso. ID: {}", saved.getId());
        return packageMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PackageTemplateResponse> getTemplatesByPartner(UUID partnerId) {
        log.info("Buscando modelos de pacotes ativos para o parceiro: {}", partnerId);
        return packageTemplateRepository.findByPartnerIdAndIsActiveTrue(partnerId).stream()
                .map(packageMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PackageTemplateResponse updateTemplate(UUID templateId, PackageTemplateRequest request) {
        log.info("Atualizando modelo de pacote ID: {}", templateId);
        PackageTemplate template = packageTemplateRepository.findById(templateId)
                .orElseThrow(() -> new br.com.easypet.payment.exception.ResourceNotFoundException("Modelo de pacote não encontrado."));

        // Validar parceiro e serviço se mudarem
        if (!template.getPartnerId().equals(request.partnerId()) || !template.getServiceId().equals(request.serviceId())) {
            br.com.easypet.payment.client.dto.PartnerResponseDto partnerDto = partnerServiceClient.getPartnerById(request.partnerId());
            if (partnerDto == null) {
                throw new br.com.easypet.payment.exception.ResourceNotFoundException("Parceiro não encontrado com o ID fornecido.");
            }
            boolean serviceExists = partnerDto.services() != null && partnerDto.services().stream()
                    .anyMatch(s -> s.id() != null && s.id().equals(request.serviceId()));
            if (!serviceExists) {
                throw new br.com.easypet.payment.exception.ResourceNotFoundException("O serviço informado não está associado ao parceiro selecionado.");
            }
            template.setPartnerId(request.partnerId());
            template.setServiceId(request.serviceId());
        }

        template.setName(request.name());
        template.setDescription(request.description());
        template.setQuantity(request.quantity());
        template.setPrice(request.price());
        template.setValidityDays(request.validityDays());

        PackageTemplate saved = packageTemplateRepository.save(template);
        return packageMapper.toResponse(saved);
    }

    @Transactional
    public void deleteTemplate(UUID templateId) {
        log.info("Excluindo (soft delete) modelo de pacote ID: {}", templateId);
        PackageTemplate template = packageTemplateRepository.findById(templateId)
                .orElseThrow(() -> new br.com.easypet.payment.exception.ResourceNotFoundException("Modelo de pacote não encontrado."));
        packageTemplateRepository.delete(template);
    }

    public CustomerPackageResponse purchasePackage(UUID templateId, UUID userId) {
        log.info("Processando compra do pacote {} pelo usuário {}", templateId, userId);

        PackageTemplate template = packageTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Modelo de pacote não encontrado."));

        if (!template.getIsActive()) {
            throw new BusinessException("Este modelo de pacote não está mais ativo para novas compras.");
        }

        // 1. Simular uma Transação Financeira com Sucesso (MOCK)
        PaymentTransaction transaction = PaymentTransaction.builder()
                .userId(userId)
                .amount(template.getPrice())
                .paymentMethod(PaymentMethod.CREDIT_CARD) // Padrão simulado
                .status("SUCCESS")
                .externalTransactionId("MOCK-TX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .build();

        PaymentTransaction savedTx = paymentTransactionRepository.save(transaction);
        log.info("Transação mock de pagamento autorizada. ID: {}", savedTx.getId());

        // 2. Gerar Saldo de Créditos para o Cliente (CustomerPackage)
        CustomerPackage customerPackage = CustomerPackage.builder()
                .userId(userId)
                .packageTemplate(template)
                .partnerId(template.getPartnerId())
                .serviceId(template.getServiceId())
                .totalCredits(template.getQuantity())
                .remainingCredits(template.getQuantity())
                .transaction(savedTx)
                .expirationDate(LocalDateTime.now().plusDays(template.getValidityDays()))
                .status(CustomerPackageStatus.ACTIVE)
                .build();

        CustomerPackage savedPackage = customerPackageRepository.save(customerPackage);
        log.info("Créditos gerados com sucesso para o usuário. ID da Compra: {}, Créditos: {}", 
                savedPackage.getId(), savedPackage.getTotalCredits());

        return packageMapper.toResponse(savedPackage);
    }

    public List<CustomerPackageResponse> getMyActivePackages(UUID userId) {
        log.info("Buscando e atualizando saldos de pacotes ativos para o usuário: {}", userId);
        
        List<CustomerPackage> rawPackages = customerPackageRepository.findByUserId(userId);
        LocalDateTime now = LocalDateTime.now();

        // Limpeza on-the-fly: Verificar expiração de datas ou créditos esgotados
        for (CustomerPackage cp : rawPackages) {
            if (cp.getStatus() == CustomerPackageStatus.ACTIVE) {
                if (cp.isExpired()) {
                    cp.setStatus(CustomerPackageStatus.EXPIRED);
                    customerPackageRepository.save(cp);
                } else if (!cp.hasCredits()) {
                    cp.setStatus(CustomerPackageStatus.EXHAUSTED);
                    customerPackageRepository.save(cp);
                }
            }
        }

        // Retornar apenas os que permaneceram efetivamente ACTIVE
        return customerPackageRepository.findByUserIdAndStatus(userId, CustomerPackageStatus.ACTIVE).stream()
                .map(packageMapper::toResponse)
                .collect(Collectors.toList());
    }

    public CreditConsumeResponse consumeCredit(CreditConsumeRequest request) {
        log.info("Requisição síncrona para consumir 1 crédito. Usuário: {}, Parceiro: {}, Serviço: {}", 
                request.userId(), request.partnerId(), request.serviceId());

        // Buscar pacotes ativos daquele usuário, parceiro e serviço
        List<CustomerPackage> activePackages = customerPackageRepository
                .findByUserIdAndPartnerIdAndServiceIdAndStatusAndRemainingCreditsGreaterThan(
                        request.userId(), request.partnerId(), request.serviceId(), CustomerPackageStatus.ACTIVE, 0);

        CustomerPackage validPackage = null;
        LocalDateTime now = LocalDateTime.now();

        // Encontrar o primeiro pacote válido (não expirado em data)
        for (CustomerPackage cp : activePackages) {
            if (cp.isExpired()) {
                cp.setStatus(CustomerPackageStatus.EXPIRED);
                customerPackageRepository.save(cp);
            } else {
                validPackage = cp;
                break;
            }
        }

        if (validPackage == null) {
            log.warn("Nenhum saldo de crédito válido encontrado para a combinação solicitada.");
            throw new BusinessException("Saldo de créditos insuficiente ou expirado para este serviço no pet shop selecionado.");
        }

        // Debitar o crédito
        int newCredits = validPackage.getRemainingCredits() - 1;
        validPackage.setRemainingCredits(newCredits);

        if (newCredits <= 0) {
            validPackage.setStatus(CustomerPackageStatus.EXHAUSTED);
            log.info("Créditos do pacote {} foram completamente esgotados.", validPackage.getId());
        }

        CustomerPackage saved = customerPackageRepository.save(validPackage);
        log.info("Débito realizado com sucesso. Novo saldo de créditos: {}", saved.getRemainingCredits());

        return new CreditConsumeResponse(saved.getId(), saved.getRemainingCredits(), true);
    }
}
