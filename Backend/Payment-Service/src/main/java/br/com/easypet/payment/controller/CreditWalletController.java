package br.com.easypet.payment.controller;

import br.com.easypet.payment.dto.request.AddCreditRequest;
import br.com.easypet.payment.dto.request.RestorePackageCreditRequest;
import br.com.easypet.payment.dto.response.CreditBalanceResponse;
import br.com.easypet.payment.service.CreditWalletService;
import br.com.easypet.payment.service.PackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/payments/credits")
@RequiredArgsConstructor
public class CreditWalletController {

    private final CreditWalletService creditWalletService;
    private final PackageService packageService;

    @GetMapping("/balance")
    public ResponseEntity<CreditBalanceResponse> getBalance(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getCredentials());
        BigDecimal balance = creditWalletService.getBalance(userId);
        return ResponseEntity.ok(new CreditBalanceResponse(balance));
    }

    // Endpoint interno — chamado pelo Booking-service ao cancelar
    @PostMapping("/add")
    public ResponseEntity<CreditBalanceResponse> addCredit(@Valid @RequestBody AddCreditRequest req) {
        BigDecimal newBalance = creditWalletService.addCredit(
                req.userId(), req.amount(), req.reason(), req.bookingId());
        return ResponseEntity.ok(new CreditBalanceResponse(newBalance));
    }

    // Endpoint interno — restaura crédito de pacote ao cancelar agendamento PACKAGE_CREDIT
    @PostMapping("/packages/restore")
    public ResponseEntity<Void> restorePackageCredit(@Valid @RequestBody RestorePackageCreditRequest req) {
        packageService.restoreCredit(req.customerPackageId());
        return ResponseEntity.ok().build();
    }
}
