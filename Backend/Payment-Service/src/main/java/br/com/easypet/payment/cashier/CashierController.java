package br.com.easypet.payment.cashier;

import br.com.easypet.payment.dto.response.ErrorResponse;
import br.com.easypet.payment.security.VerifiedSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static br.com.easypet.payment.cashier.CashierModels.*;

@RestController
@RequestMapping("/payments/cashier")
class CashierController {
    private static final String IDEMPOTENCY_KEY = "Idempotency-Key";
    private final CashierService cashier;
    private final CashierAccess access;

    CashierController(CashierService cashier, CashierAccess access) {
        this.cashier = cashier;
        this.access = access;
    }

    @GetMapping("/context")
    Context context(Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        VerifiedSession session = (VerifiedSession) actor.getPrincipal();
        return cashier.context(access.resolve(actor, authorization), session.canUseCashier("CASH_CLOSE"));
    }

    @GetMapping("/charges")
    Page<Charge> charges(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(defaultValue = "true") boolean openOnly,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return cashier.charges(access.resolve(actor, authorization), openOnly, page, size);
    }

    @GetMapping("/charges/{chargeId}")
    ChargeDetails charge(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable UUID chargeId
    ) {
        return cashier.chargeDetails(access.resolve(actor, authorization), chargeId);
    }

    @PostMapping("/charges")
    Id createCharge(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(IDEMPOTENCY_KEY) UUID key, @Valid @RequestBody NewCharge request
    ) {
        return cashier.createCharge(access.resolve(actor, authorization), key, request, authorization);
    }

    @PostMapping("/charges/{chargeId}/receipts")
    Id receive(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(IDEMPOTENCY_KEY) UUID key, @PathVariable UUID chargeId, @Valid @RequestBody NewReceipt request
    ) {
        return cashier.receive(access.resolve(actor, authorization), key, chargeId, request);
    }

    @PostMapping("/charges/{chargeId}/approved-extras")
    Id applyExtra(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(IDEMPOTENCY_KEY) UUID key, @PathVariable UUID chargeId, @Valid @RequestBody ApplyExtra request
    ) {
        return cashier.applyExtra(access.resolve(actor, authorization), key, chargeId, request);
    }

    @PostMapping("/receipts/{receiptId}/reverse")
    Id reverse(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(IDEMPOTENCY_KEY) UUID key, @PathVariable UUID receiptId, @Valid @RequestBody NewReversal request
    ) {
        return cashier.reverse(access.resolve(actor, authorization), key, receiptId, request);
    }

    @GetMapping("/days")
    Day day(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return cashier.day(access.resolve(actor, authorization), date, page, size);
    }

    @PostMapping("/days/{date}/close")
    Id close(
            Authentication actor, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(IDEMPOTENCY_KEY) UUID key,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return cashier.close(access.resolve(actor, authorization), key, date);
    }
}

@RestControllerAdvice(assignableTypes = {CashierController.class, AdminCashierController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
class CashierErrors {
    @ExceptionHandler(CashierException.class)
    ResponseEntity<?> cashierError(CashierException error) {
        if (error.code() == null) {
            return ResponseEntity.status(error.status()).body(new ErrorResponse(error.status().value(), error.getMessage()));
        }
        return ResponseEntity.status(error.status()).body(new CodedError(error.status().value(), error.getMessage(),
                LocalDateTime.now(), null, error.code()));
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class, ServletRequestBindingException.class,
            HandlerMethodValidationException.class, MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<ErrorResponse> invalidRequest() {
        return ResponseEntity.badRequest().body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(),
                "Confira os valores, a data e a chave de idempotência da solicitação."));
    }

    private record CodedError(int status, String message, LocalDateTime timestamp, Map<String, String> errors, String code) {}
}
