package br.com.innkercode.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Armazena códigos de troca efêmeros para o fluxo OAuth2.
 *
 * Fluxo:
 *  1. OAuth2SuccessHandler gera um código de uso único e armazena o JWT associado (TTL 2 min).
 *  2. O frontend recebe apenas o código curto na URL de redirect (não o JWT).
 *  3. O frontend faz POST /auth/oauth2/exchange?code=... e recebe o JWT no body da resposta.
 *  4. O código é imediatamente removido do mapa após o uso (one-time use).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2TokenExchangeService {

    private static final int CODE_EXPIRY_SECONDS = 120; // 2 minutos

    // Mapa: código efêmero -> JWT
    private final Map<String, String> pendingTokens = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Gera um código aleatório seguro, associa ao JWT e agenda expiração automática.
     */
    public String createExchangeCode(String jwt) {
        String code = generateSecureCode();
        pendingTokens.put(code, jwt);
        log.debug("Código de troca OAuth2 criado. TTL: {}s", CODE_EXPIRY_SECONDS);

        // Remove automaticamente após TTL para evitar acúmulo de tokens
        scheduler.schedule(() -> {
            pendingTokens.remove(code);
            log.debug("Código de troca OAuth2 expirado e removido.");
        }, CODE_EXPIRY_SECONDS, TimeUnit.SECONDS);

        return code;
    }

    /**
     * Troca o código pelo JWT e o remove imediatamente (one-time use).
     * Retorna null se o código for inválido ou já tiver sido usado.
     */
    public String exchangeCodeForToken(String code) {
        String jwt = pendingTokens.remove(code);
        if (jwt == null) {
            log.warn("Tentativa de troca com código OAuth2 inválido ou já utilizado.");
        }
        return jwt;
    }

    private String generateSecureCode() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
