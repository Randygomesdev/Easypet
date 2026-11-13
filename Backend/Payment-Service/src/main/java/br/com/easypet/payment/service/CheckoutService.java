package br.com.easypet.payment.service;

import br.com.easypet.payment.domain.entity.PaymentTransaction;
import br.com.easypet.payment.domain.enums.PaymentMethod;
import br.com.easypet.payment.dto.request.CheckoutRequest;
import br.com.easypet.payment.dto.response.CheckoutResponse;
import br.com.easypet.payment.exception.BusinessException;
import br.com.easypet.payment.repository.PaymentTransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class CheckoutService {

    private final PaymentTransactionRepository transactionRepository;
    private final ObjectMapper objectMapper;

    @Value("${mercadopago.access-token}")
    private String accessToken;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.checkout-enabled:false}")
    private boolean checkoutEnabled;

    public CheckoutResponse createCheckout(UUID userId, CheckoutRequest request) {
        if (!checkoutEnabled) {
            throw new BusinessException("Checkout indisponível neste ambiente.");
        }
        MercadoPagoConfig.setAccessToken(accessToken);

        List<PreferenceItemRequest> mpItems = request.items().stream()
                .map(item -> PreferenceItemRequest.builder()
                        .id(item.productId())
                        .title(item.label())
                        .description(item.description())
                        .quantity(item.quantity())
                        .unitPrice(item.price())
                        .currencyId("BRL")
                        .build())
                .collect(Collectors.toList());

        String successUrl = resolve(request.successUrl(), "/app/pagamento/sucesso");
        String failureUrl = resolve(request.failureUrl(), "/app/pagamento/falha");
        String pendingUrl = resolve(request.pendingUrl(), "/app/pagamento/pendente");

        UUID txId = UUID.randomUUID();

        PreferenceRequest mpRequest = PreferenceRequest.builder()
                .items(mpItems)
                .backUrls(PreferenceBackUrlsRequest.builder()
                        .success(successUrl)
                        .failure(failureUrl)
                        .pending(pendingUrl)
                        .build())
                .externalReference(txId.toString())
                .build();

        Preference preference;
        try {
            preference = new PreferenceClient().create(mpRequest);
        } catch (MPApiException e) {
            log.error("Erro MP API: status={} body={}", e.getStatusCode(),
                    e.getApiResponse() != null ? e.getApiResponse().getContent() : "null");
            throw new BusinessException("Erro ao iniciar pagamento. Tente novamente.");
        } catch (MPException e) {
            log.error("Erro MP SDK: {}", e.getMessage());
            throw new BusinessException("Erro ao iniciar pagamento. Tente novamente.");
        }

        BigDecimal total = request.items().stream()
                .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String itemsJson;
        try {
            itemsJson = objectMapper.writeValueAsString(request.items());
        } catch (JsonProcessingException e) {
            itemsJson = "[]";
        }

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(txId)
                .userId(userId)
                .amount(total)
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .status("PENDING")
                .preferenceId(preference.getId())
                .itemsJson(itemsJson)
                .build();

        transactionRepository.save(tx);
        log.info("Checkout criado: preferenceId={} txId={} userId={} total={}", preference.getId(), txId, userId, total);

        return new CheckoutResponse(
                tx.getId(),
                preference.getId(),
                preference.getInitPoint(),
                preference.getSandboxInitPoint()
        );
    }

    @Transactional
    public void handleWebhook(String paymentId) {
        log.info("Webhook MP recebido: paymentId={}", paymentId);
        MercadoPagoConfig.setAccessToken(accessToken);

        try {
            Payment mpPayment = new PaymentClient().get(Long.parseLong(paymentId));
            String externalRef = mpPayment.getExternalReference();
            if (externalRef == null || externalRef.isBlank()) {
                log.warn("Webhook sem externalReference: paymentId={}", paymentId);
                return;
            }

            UUID txId = UUID.fromString(externalRef);
            transactionRepository.findById(txId).ifPresent(tx -> {
                String newStatus = mapStatus(mpPayment.getStatus());
                tx.setStatus(newStatus);
                tx.setExternalTransactionId(paymentId);
                transactionRepository.save(tx);
                log.info("Transação {} atualizada para {}", txId, newStatus);
            });
        } catch (Exception e) {
            log.warn("Erro ao processar webhook MP paymentId={}: {}", paymentId, e.getMessage());
        }
    }

    private String mapStatus(String mpStatus) {
        return switch (mpStatus) {
            case "approved" -> "SUCCESS";
            case "rejected", "cancelled" -> "FAILED";
            default -> "PENDING";
        };
    }

    private String resolve(String supplied, String defaultPath) {
        return (supplied != null && !supplied.isBlank()) ? supplied : frontendUrl + defaultPath;
    }
}
