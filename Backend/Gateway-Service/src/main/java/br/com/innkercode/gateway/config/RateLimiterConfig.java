package br.com.innkercode.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Configuration
public class RateLimiterConfig {
    public static final String CLIENT_IP = "X-Easypet-Client-IP";
    public static final String INGRESS_TOKEN = "X-Easypet-Ingress-Token";

    @Bean
    public KeyResolver ipKeyResolver(@Value("${HOMOLOG_INGRESS_TOKEN:}") String ingressToken) {
        byte[] trustedToken = ingressToken.getBytes(StandardCharsets.UTF_8);
        return exchange -> {
            var request = exchange.getRequest();
            var headers = request.getHeaders();
            String proof = headers.getFirst(INGRESS_TOKEN);
            String client = headers.getFirst(CLIENT_IP);
            if (trustedToken.length >= 32 && proof != null && client != null
                    && MessageDigest.isEqual(trustedToken, proof.getBytes(StandardCharsets.UTF_8))
                    && client.matches("[0-9a-fA-F:.]{1,45}")) {
                return Mono.just(client);
            }
            String ip = request.getRemoteAddress() != null
                    ? request.getRemoteAddress().getHostString()
                    : "unknown";
            return Mono.just(ip);
        };
    }
}
