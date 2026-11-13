package br.com.easypet.payment.service;

import br.com.easypet.payment.client.PartnerServiceClient;
import br.com.easypet.payment.client.dto.PartnerResponseDto;
import br.com.easypet.payment.client.dto.ServiceResponseDto;
import br.com.easypet.payment.domain.entity.CustomerPackage;
import br.com.easypet.payment.domain.entity.PackageTemplate;
import br.com.easypet.payment.domain.entity.PaymentTransaction;
import br.com.easypet.payment.domain.enums.CustomerPackageStatus;
import br.com.easypet.payment.dto.request.CreditConsumeRequest;
import br.com.easypet.payment.dto.request.PackageTemplateRequest;
import br.com.easypet.payment.dto.response.CreditConsumeResponse;
import br.com.easypet.payment.dto.response.CustomerPackageResponse;
import br.com.easypet.payment.dto.response.PackageTemplateResponse;
import br.com.easypet.payment.exception.BusinessException;
import br.com.easypet.payment.mapper.PackageMapper;
import br.com.easypet.payment.repository.CustomerPackageRepository;
import br.com.easypet.payment.repository.PackageTemplateRepository;
import br.com.easypet.payment.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PackageServiceTest {

    @Mock
    private PackageTemplateRepository packageTemplateRepository;

    @Mock
    private CustomerPackageRepository customerPackageRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private PackageMapper packageMapper;

    @Mock
    private PartnerServiceClient partnerServiceClient;

    @InjectMocks
    private PackageService packageService;

    @Test
    void disabledCreditsRejectPurchaseAndConsumptionBeforeAnyDatabaseAccess() {
        ReflectionTestUtils.setField(packageService, "packageCreditsEnabled", false);
        UUID userId = UUID.randomUUID();

        assertThrows(BusinessException.class, () -> packageService.purchasePackage(UUID.randomUUID(), userId));
        assertThrows(BusinessException.class, () -> packageService.consumeCredit(
                new CreditConsumeRequest(userId, UUID.randomUUID(), UUID.randomUUID())));
        verifyNoInteractions(packageTemplateRepository, customerPackageRepository, paymentTransactionRepository);
    }

    @Test
    void createTemplate_Success() {
        UUID partnerId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        PackageTemplateRequest request = new PackageTemplateRequest(
                partnerId, "Pacote 4 Banhos", "Descrição", serviceId, 4, BigDecimal.valueOf(180.00), 30
        );

        ServiceResponseDto serviceDto = new ServiceResponseDto(serviceId);
        PartnerResponseDto partnerDto = new PartnerResponseDto(partnerId, List.of(serviceDto));
        
        PackageTemplate template = PackageTemplate.builder()
                .partnerId(partnerId)
                .name("Pacote 4 Banhos")
                .serviceId(serviceId)
                .quantity(4)
                .price(BigDecimal.valueOf(180.00))
                .validityDays(30)
                .build();

        PackageTemplateResponse expectedResponse = new PackageTemplateResponse(
                UUID.randomUUID(), partnerId, "Pacote 4 Banhos", "Descrição", serviceId, 4, BigDecimal.valueOf(180.00), 30, true
        );

        when(partnerServiceClient.getOperations(partnerId)).thenReturn(partnerDto);
        when(packageMapper.toEntity(request)).thenReturn(template);
        when(packageTemplateRepository.save(any(PackageTemplate.class))).thenReturn(template);
        when(packageMapper.toResponse(any(PackageTemplate.class))).thenReturn(expectedResponse);

        PackageTemplateResponse response = packageService.createTemplate(request);

        assertNotNull(response);
        assertEquals(expectedResponse.name(), response.name());
        verify(packageTemplateRepository, times(1)).save(any(PackageTemplate.class));
    }

    @Test
    void purchasePackage_Success() {
        UUID templateId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        
        PackageTemplate template = PackageTemplate.builder()
                .id(templateId)
                .partnerId(UUID.randomUUID())
                .name("Pacote 4 Banhos")
                .serviceId(UUID.randomUUID())
                .quantity(4)
                .price(BigDecimal.valueOf(180.00))
                .validityDays(30)
                .isActive(true)
                .build();

        CustomerPackage customerPackage = CustomerPackage.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .packageTemplate(template)
                .partnerId(template.getPartnerId())
                .serviceId(template.getServiceId())
                .totalCredits(4)
                .remainingCredits(4)
                .status(CustomerPackageStatus.ACTIVE)
                .build();

        CustomerPackageResponse expectedResponse = new CustomerPackageResponse(
                customerPackage.getId(), userId, templateId, "Pacote 4 Banhos", template.getPartnerId(), template.getServiceId(), 4, 4, LocalDateTime.now().plusDays(30), "ACTIVE"
        );

        when(packageTemplateRepository.findById(templateId)).thenReturn(Optional.of(template));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(i -> i.getArguments()[0]);
        when(customerPackageRepository.save(any(CustomerPackage.class))).thenReturn(customerPackage);
        when(packageMapper.toResponse(any(CustomerPackage.class))).thenReturn(expectedResponse);

        CustomerPackageResponse response = packageService.purchasePackage(templateId, userId);

        assertNotNull(response);
        assertEquals("ACTIVE", response.status());
        assertEquals(4, response.totalCredits());
        verify(paymentTransactionRepository, times(1)).save(any(PaymentTransaction.class));
        verify(customerPackageRepository, times(1)).save(any(CustomerPackage.class));
    }

    @Test
    void consumeCredit_Success() {
        UUID userId = UUID.randomUUID();
        UUID partnerId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        
        CustomerPackage cp = CustomerPackage.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .partnerId(partnerId)
                .serviceId(serviceId)
                .remainingCredits(3)
                .expirationDate(LocalDateTime.now().plusDays(10))
                .status(CustomerPackageStatus.ACTIVE)
                .build();

        CreditConsumeRequest request = new CreditConsumeRequest(userId, partnerId, serviceId);

        when(customerPackageRepository.findByUserIdAndPartnerIdAndServiceIdAndStatusAndRemainingCreditsGreaterThan(
                userId, partnerId, serviceId, CustomerPackageStatus.ACTIVE, 0))
                .thenReturn(List.of(cp));
        when(customerPackageRepository.save(any(CustomerPackage.class))).thenAnswer(i -> i.getArguments()[0]);

        CreditConsumeResponse response = packageService.consumeCredit(request);

        assertNotNull(response);
        assertTrue(response.success());
        assertEquals(2, response.remainingCredits());
        assertEquals(cp.getId(), response.customerPackageId());
    }

    @Test
    void consumeCredit_InsufficientCredits() {
        UUID userId = UUID.randomUUID();
        UUID partnerId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();

        CreditConsumeRequest request = new CreditConsumeRequest(userId, partnerId, serviceId);

        when(customerPackageRepository.findByUserIdAndPartnerIdAndServiceIdAndStatusAndRemainingCreditsGreaterThan(
                userId, partnerId, serviceId, CustomerPackageStatus.ACTIVE, 0))
                .thenReturn(Collections.emptyList());

        assertThrows(BusinessException.class, () -> packageService.consumeCredit(request));
    }
}
