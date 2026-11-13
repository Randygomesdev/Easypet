package br.com.innkercode.auth.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorResponse(
        int status,
        String message,
        LocalDateTime timestamp,
        Map<String, String> errors,
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        String code
) {
    public ErrorResponse(int status, String message) {
        this(status, message, LocalDateTime.now(), null, null);
    }
}
