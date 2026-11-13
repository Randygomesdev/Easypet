package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.dto.request.AuthenticationRequest;
import br.com.innkercode.auth.dto.request.ForgotPasswordRequest;
import br.com.innkercode.auth.dto.request.OneTimeTokenRequest;
import br.com.innkercode.auth.dto.request.ResetPasswordRequest;
import br.com.innkercode.auth.dto.response.AuthenticationResponse;
import br.com.innkercode.auth.dto.response.SessionResponse;
import br.com.innkercode.auth.dto.request.RegisterRequest;

import br.com.innkercode.auth.service.AuthService;
import br.com.innkercode.auth.service.PasswordRecoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Endpoints para registro e login de usuários")
public class AuthController {

    private final AuthService authService;
    private final PasswordRecoveryService passwordRecovery;

    @PostMapping("/register")
    @Operation(summary = "Registrar um novo usuário", description = "Cria um novo usuário no sistema e retorna um token JWT")
    public ResponseEntity<AuthenticationResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/register/partner")
    public ResponseEntity<AuthenticationResponse> registerPartner(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerPartner(request));
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
        passwordRecovery.request(request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password/validate")
    public ResponseEntity<Void> validateReset(@Valid @RequestBody OneTimeTokenRequest request) {
        passwordRecovery.validate(request.token());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Resetar senha do usuário", description = "Valida o token de recuperação e atualiza a senha do usuário no banco de dados.")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordRecovery.reset(request.token(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/session")
    public ResponseEntity<SessionResponse> session(
            @RequestAttribute(SessionResponse.REQUEST_ATTRIBUTE) SessionResponse session) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(session);
    }

}
