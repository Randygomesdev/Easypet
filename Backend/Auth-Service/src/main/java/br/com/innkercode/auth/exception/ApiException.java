package br.com.innkercode.auth.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ApiException emailTaken() {
        return new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "Este e-mail já está cadastrado.");
    }

    public static ApiException invalidSession() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sessão inválida ou expirada.");
    }
}
