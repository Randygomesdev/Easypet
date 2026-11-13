package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.config.GoogleAuthSettings;
import br.com.innkercode.auth.dto.response.AuthenticationResponse;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.security.GoogleOAuthFlow;
import br.com.innkercode.auth.service.GoogleAccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.google-auth.enabled", havingValue = "true")
public class GoogleOAuthController {

    private final GoogleAuthSettings settings;
    private final GoogleOAuthFlow flow;
    private final GoogleAccountService accounts;

    @PostMapping(path = "/auth/oauth2/exchange", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthenticationResponse> exchange(@Valid @RequestBody ExchangeRequest exchange,
                                                           HttpServletRequest request) {
        if (!settings.origin().toString().equals(request.getHeader(HttpHeaders.ORIGIN))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "OAUTH_ORIGIN_INVALID", "Origem da solicitação recusada.");
        }
        var account = accounts.exchange(flow.consume(request, exchange.code()));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(account);
    }

    public record ExchangeRequest(@NotNull @Pattern(regexp = "[A-Za-z0-9_-]{43}") String code) {}
}
