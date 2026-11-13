package br.com.easypet.payment.controller;

import br.com.easypet.payment.dto.request.CheckoutRequest;
import br.com.easypet.payment.dto.request.MercadoPagoWebhookRequest;
import br.com.easypet.payment.dto.response.CheckoutResponse;
import br.com.easypet.payment.service.CheckoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Checkout", description = "Criação de preferência de pagamento e webhook do Mercado Pago")
public class CheckoutController {

    private final CheckoutService checkoutService;

    @PostMapping("/checkout")
    @Operation(summary = "Iniciar checkout", description = "Cria uma preferência no Mercado Pago e retorna o link de pagamento.")
    public ResponseEntity<CheckoutResponse> checkout(
            @Valid @RequestBody CheckoutRequest request,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getCredentials());
        return ResponseEntity.ok(checkoutService.createCheckout(userId, request));
    }

    @PostMapping("/webhook/mercadopago")
    @Operation(summary = "Webhook Mercado Pago", description = "Recebe notificações de status de pagamento do Mercado Pago.")
    public ResponseEntity<Void> webhook(@RequestBody MercadoPagoWebhookRequest body) {
        if ("payment".equals(body.type()) && body.data() != null && body.data().id() != null) {
            checkoutService.handleWebhook(body.data().id());
        }
        return ResponseEntity.ok().build();
    }
}
