package br.com.innkercode.gateway.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class AuthSessionFilterTest {
    private static final String TEAM_SESSION = """
            {"userId":"21ac3247-72fb-45c5-badb-0ab3360b1943","role":"TEAM_MEMBER",
             "partnerId":"404de755-6388-47c1-978f-cfd19f989531","accessRole":"RECEPTION",
             "permissions":["BOOKINGS_READ"],"teamAccessId":"a3e3b155-1267-4d2c-95c0-cc290bf9755d"}
            """;

    @Test
    void delegatesTeamCredentialAndStripsForgedIdentityWithoutCaching() {
        AtomicInteger calls = new AtomicInteger();
        var filter = filter(WebClient.builder().exchangeFunction(request -> {
            calls.incrementAndGet();
            assertEquals("/api/v1/auth/session", request.url().getPath());
            assertEquals("Bearer team-token", request.headers().getFirst(HttpHeaders.AUTHORIZATION));
            return Mono.just(response(HttpStatus.OK, TEAM_SESSION));
        }));

        for (int index = 0; index < 2; index++) {
            var exchange = exchange("/api/v1/bookings");
            filter.filter(exchange, forwarded -> {
                assertFalse(forwarded.getRequest().getHeaders().containsKey("X-User-Role"));
                assertEquals("Bearer team-token", forwarded.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                return Mono.empty();
            }).block();
        }
        assertEquals(2, calls.get());
    }

    @Test
    void forwardsSessionToAuthWithoutCallingItTwice() {
        var filter = filter(WebClient.builder().exchangeFunction(request -> fail("Consulta recursiva de sessão")));
        AtomicInteger forwarded = new AtomicInteger();
        filter.filter(exchange("/api/v1/auth/session"), ignored -> {
            forwarded.incrementAndGet();
            return Mono.empty();
        }).block();
        assertEquals(1, forwarded.get());
    }

    @Test
    void rejectsRevokedSessionAndFailsClosedOnInvalidResponseOrTimeout() {
        assertDenied(Mono.just(response(HttpStatus.UNAUTHORIZED, "")), HttpStatus.UNAUTHORIZED);
        assertDenied(Mono.just(response(HttpStatus.ACCEPTED, TEAM_SESSION)), HttpStatus.SERVICE_UNAVAILABLE);
        assertDenied(Mono.just(response(HttpStatus.OK, "{\"role\":\"ADMIN\"}")), HttpStatus.SERVICE_UNAVAILABLE);
        assertDenied(Mono.just(response(HttpStatus.NO_CONTENT, "")), HttpStatus.SERVICE_UNAVAILABLE);
        assertDenied(Mono.never(), HttpStatus.SERVICE_UNAVAILABLE);
    }

    private static void assertDenied(Mono<ClientResponse> auth, HttpStatus expected) {
        var exchange = exchange("/api/v1/bookings");
        filter(WebClient.builder().exchangeFunction(request -> auth))
                .filter(exchange, ignored -> fail("Sessão inválida alcançou o serviço"))
                .block(Duration.ofSeconds(2));
        assertEquals(expected, exchange.getResponse().getStatusCode());
        assertEquals("no-store", exchange.getResponse().getHeaders().getCacheControl());
    }

    private static JwtGlobalFilter filter(WebClient.Builder client) {
        return new JwtGlobalFilter(new AuthSessionClient(client, "http://auth.test", Duration.ofMillis(500)), true);
    }

    private static MockServerWebExchange exchange(String path) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer team-token").header("X-User-Role", "ADMIN"));
    }

    private static ClientResponse response(HttpStatus status, String body) {
        return ClientResponse.create(status).header(HttpHeaders.CONTENT_TYPE, "application/json").body(body).build();
    }
}
