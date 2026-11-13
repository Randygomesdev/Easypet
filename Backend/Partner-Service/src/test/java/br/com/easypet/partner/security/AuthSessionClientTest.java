package br.com.easypet.partner.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.*;

class AuthSessionClientTest {
    private static final UUID USER = UUID.randomUUID();
    private static final String BODY = """
            {"userId":"%s","role":"CUSTOMER","partnerId":null,"accessRole":null,"permissions":[]}
            """.formatted(USER);

    @ParameterizedTest
    @ValueSource(ints = {202, 204, 302})
    void rejectsUnexpectedStatusEvenWithValidBody(int status) throws IOException {
        try (var fixture = new SessionFixture(status, BODY)) {
            assertThatThrownBy(() -> fixture.client().read("Bearer test")).isInstanceOf(IllegalStateException.class);
        }
    }

    @Test
    void observesRevocationOnTheNextRequestWithoutCaching() throws IOException {
        try (var fixture = new SessionFixture(200, BODY)) {
            var client = fixture.client();
            assertThat(client.read("Bearer test").userId()).isEqualTo(USER);
            assertThat(fixture.bearer.get()).isEqualTo("Bearer test");
            fixture.status.set(401);
            assertThat(client.read("Bearer test")).isNull();
        }
    }

    private static final class SessionFixture implements AutoCloseable {
        private final HttpServer server;
        private final AtomicReference<Integer> status;
        private final AtomicReference<String> bearer = new AtomicReference<>();

        private SessionFixture(int status, String body) throws IOException {
            this.status = new AtomicReference<>(status);
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/v1/auth/session", exchange -> {
                bearer.set(exchange.getRequestHeaders().getFirst("Authorization"));
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                byte[] payload = body.getBytes(StandardCharsets.UTF_8);
                int code = this.status.get();
                if (code == 302) exchange.getResponseHeaders().set("Location", "/valid-session");
                exchange.sendResponseHeaders(code, code == 204 ? -1 : payload.length);
                if (code != 204) exchange.getResponseBody().write(payload);
                exchange.close();
            });
            server.createContext("/valid-session", exchange -> {
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                byte[] payload = body.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, payload.length);
                exchange.getResponseBody().write(payload);
                exchange.close();
            });
            server.start();
        }

        private AuthSessionClient client() {
            return new AuthSessionClient("http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1", "");
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }
}
