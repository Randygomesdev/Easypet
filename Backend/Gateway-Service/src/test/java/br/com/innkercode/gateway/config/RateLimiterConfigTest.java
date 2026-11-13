package br.com.innkercode.gateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import java.net.InetSocketAddress;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimiterConfigTest {
    private static final String TOKEN = "0123456789abcdef0123456789abcdef";

    @Test
    void acceptsDifferentClientKeysFromAuthenticatedIngress() {
        assertEquals("192.0.2.10", key(TOKEN, "192.0.2.10"));
        assertEquals("2001:db8::2", key(TOKEN, "2001:db8::2"));
    }

    @Test
    void ignoresUntrustedForwardingAndAddressLists() {
        assertEquals("198.51.100.7", key("forjado", "192.0.2.10"));
        assertEquals("198.51.100.7", key(TOKEN, "192.0.2.10, 192.0.2.11"));
    }

    private String key(String token, String ip) {
        var request = MockServerHttpRequest.get("/api/v1/auth/login")
                .remoteAddress(new InetSocketAddress("198.51.100.7", 1234))
                .header(RateLimiterConfig.INGRESS_TOKEN, token)
                .header(RateLimiterConfig.CLIENT_IP, ip)
                .header("X-Forwarded-For", "203.0.113.1")
                .build();
        return new RateLimiterConfig().ipKeyResolver(TOKEN).resolve(MockServerWebExchange.from(request)).block();
    }
}
