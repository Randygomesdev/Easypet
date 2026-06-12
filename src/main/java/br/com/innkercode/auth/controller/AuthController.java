package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.dto.request.AuthenticationRequest;
import br.com.innkercode.auth.dto.request.ForgotPasswordRequest;
import br.com.innkercode.auth.dto.request.ResetPasswordRequest;
import br.com.innkercode.auth.dto.response.AuthenticationResponse;
import br.com.innkercode.auth.dto.request.RegisterRequest;

import br.com.innkercode.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import br.com.innkercode.auth.service.OAuth2TokenExchangeService;

import java.net.URI;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Endpoints para registro e login de usuários")
public class AuthController {

    private final AuthService authService;
    private final OAuth2TokenExchangeService tokenExchangeService;

    @PostMapping("/register")
    @Operation(summary = "Registrar um novo usuário", description = "Cria um novo usuário no sistema e retorna um token JWT")
    public ResponseEntity<AuthenticationResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Recebida requisição de registro.");
        AuthenticationResponse response = authService.register(request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand("me")
                .toUri();
        log.info("Usuário registrado com sucesso.");
        return ResponseEntity.created(uri).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Autenticar um usuário", description = "Valida as credenciais e retorna um token JWT")
    public ResponseEntity<AuthenticationResponse> authenticate(@Valid @RequestBody AuthenticationRequest request) {
        log.info("Tentativa de login recebida.");
        AuthenticationResponse response = authService.authenticate(request);
        log.info("Login realizado com sucesso.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Solicitar recuperação de senha", description = "Gera um token de recuperação e envia por e-mail para o usuário, caso o e-mail esteja cadastrado.")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Recebida requisição REST para forgot-password: {}", request.email());
        authService.forgotPassword(request.email());
        return ResponseEntity.ok().build();
    }
    @PostMapping("/reset-password")
    @Operation(summary = "Resetar senha do usuário", description = "Valida o token de recuperação e atualiza a senha do usuário no banco de dados.")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Solicitação de reset de senha recebida com token");
        authService.resetPassword(request.token(), request.newPassword());
        log.info("Senha alterada com sucesso via reset de senha");
        return ResponseEntity.ok().build();
    }

    @PostMapping("/oauth2/exchange")
    @Operation(summary = "Trocar código OAuth2 por JWT",
               description = "Recebe o código de troca efêmero gerado pelo fluxo OAuth2 e retorna o JWT real. Código expira em 2 minutos e só pode ser usado uma vez.")
    public ResponseEntity<AuthenticationResponse> exchangeOAuth2Code(@RequestParam String code) {
        log.info("Recebida solicitação de troca de código OAuth2.");
        String jwt = tokenExchangeService.exchangeCodeForToken(code);
        if (jwt == null) {
            log.warn("Código OAuth2 inválido ou expirado.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(new AuthenticationResponse(jwt, null, null, null, null, null));
    }
}
