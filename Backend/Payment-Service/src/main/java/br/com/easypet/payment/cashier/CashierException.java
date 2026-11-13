package br.com.easypet.payment.cashier;

import org.springframework.http.HttpStatus;

final class CashierException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    CashierException(HttpStatus status, String message) {
        this(status, message, null);
    }

    CashierException(HttpStatus status, String message, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }

    HttpStatus status() {
        return status;
    }

    String code() {
        return code;
    }
}
