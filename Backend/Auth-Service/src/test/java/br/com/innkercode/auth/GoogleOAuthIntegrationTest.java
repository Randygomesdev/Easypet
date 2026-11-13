package br.com.innkercode.auth;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "AUTH_DB_URL=${S02_PG_URL:}",
        "AUTH_DB_USERNAME=${S02_PG_USERNAME:s02test}",
        "AUTH_DB_PASSWORD=${S02_PG_PASSWORD:s02-local-test-only}",
        "JWT_SECRET=oauth-local-test-shared-signature-key",
        "GOOGLE_AUTH_ENABLED=true",
        "GOOGLE_CLIENT_ID=local-google-client",
        "GOOGLE_CLIENT_SECRET=local-google-secret",
        "GOOGLE_ALLOWED_EMAILS=tutor@gmail.com,owner@gmail.com,admin@gmail.com,team@gmail.com,missing@gmail.com,legacy@example.test,staff@example.test"
})
@ActiveProfiles("homolog")
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "S02_PG_URL", matches = ".+")
class GoogleOAuthIntegrationTest {

    private static final String SCHEMA = "s02_google_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final String ORIGIN = "https://easypet.example.test";
    private static final String AUTHORIZE = "/oauth2/authorization/google";
    private static final String CALLBACK = "/login/oauth2/code/google";
    private static final String EXCHANGE = "/auth/oauth2/exchange";
    private static final String REDIRECT = ORIGIN + "/api/v1" + CALLBACK;
    private static final String CLIENT = "local-google-client";
    private static final Instant CLOCK_START = Instant.parse("2026-11-13T21:00:00Z");
    private static final Provider PROVIDER = new Provider();

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @MockitoBean Clock clock;

    @DynamicPropertySource
    static void settings(DynamicPropertyRegistry registry) {
        registry.add("spring.flyway.schemas", () -> SCHEMA);
        registry.add("spring.datasource.hikari.connection-init-sql", () -> "set search_path to " + SCHEMA);
        registry.add("FRONTEND_URL", () -> ORIGIN);
        registry.add("GOOGLE_REDIRECT_URI", () -> REDIRECT);
        var provider = "spring.security.oauth2.client.provider.google.";
        registry.add(provider + "authorization-uri", () -> PROVIDER.origin() + "/authorize");
        registry.add(provider + "token-uri", () -> PROVIDER.origin() + "/token");
        registry.add(provider + "jwk-set-uri", () -> PROVIDER.origin() + "/jwks");
        registry.add(provider + "issuer-uri", PROVIDER::origin);
    }

    @BeforeEach
    void clean() {
        db.execute("truncate table team_accesses, password_reset_tokens, users");
        when(clock.instant()).thenReturn(CLOCK_START);
    }

    @AfterAll
    static void close(@Autowired JdbcTemplate database) {
        PROVIDER.close();
        database.execute("drop schema if exists " + SCHEMA + " cascade");
    }

    @Test
    void authorizationUsesConfiguredCallbackStateNonceAndPkce() throws Exception {
        var start = start();
        assertThat(start.redirect()).startsWith(PROVIDER.origin() + "/authorize?");
        assertThat(start.params().get("redirect_uri")).isEqualTo(REDIRECT);
        assertThat(start.params().get("scope").split(" ")).containsExactlyInAnyOrder("openid", "profile", "email");
        assertThat(start.params().get("state")).isNotBlank();
        assertThat(start.params().get("nonce")).isNotBlank();
        assertThat(start.params().get("code_challenge")).isNotBlank();
        assertThat(start.params().get("code_challenge_method")).isEqualTo("S256");
    }

    @Test
    void wrongStateAndCancellationAreRecoverableWithoutBindingAnAccount() throws Exception {
        var start = start();
        mvc.perform(get(CALLBACK).servletPath(CALLBACK).session(start.session())
                        .param("state", "wrong").param("code", "invalid"))
                .andExpect(redirectedUrl(ORIGIN + "/login?error=google_failed"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"));

        mvc.perform(get(CALLBACK).servletPath(CALLBACK).session(start.session())
                        .param("state", start.params().get("state")).param("error", "access_denied")
                        .param("error_description", "private details"))
                .andExpect(redirectedUrl(ORIGIN + "/login?error=google_cancelled"));
    }

    @Test
    void signedIdTokenRequiresIssuerAudienceNonceAndSignature() throws Exception {
        account("tutor@gmail.com", UserRole.CUSTOMER, true, 0);
        for (String invalid : new String[] {"issuer", "audience", "nonce", "signature"}) {
            var start = start();
            assertThat(callback(start, identity("tutor@gmail.com", "google-tutor"), invalid)
                    .getResponse().getRedirectedUrl()).isEqualTo(ORIGIN + "/login?error=google_failed");
        }
        assertThat(users.findByEmail("tutor@gmail.com").orElseThrow().getGoogleSubject()).isNull();
    }

    @Test
    void exchangeIsOriginAndBrowserBoundExpiresAndCannotReplay() throws Exception {
        account("tutor@gmail.com", UserRole.CUSTOMER, true, 4);
        var first = start();
        String originalSessionId = first.session().getId();
        String code = validCode(first, identity("tutor@gmail.com", "google-tutor"));
        assertThat(first.session().getId()).isNotEqualTo(originalSessionId);
        mvc.perform(post(EXCHANGE).header(HttpHeaders.ORIGIN, ORIGIN)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED).param("code", code))
                .andExpect(status().isUnsupportedMediaType());
        exchange("invalid-code", first.session(), ORIGIN).andExpect(status().isBadRequest());
        exchange(code, new MockHttpSession(), ORIGIN).andExpect(status().isUnauthorized());
        exchange(code, first.session(), "https://other.example.test").andExpect(status().isForbidden());
        var response = exchange(code, first.session(), ORIGIN).andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.role").value("CUSTOMER")).andReturn();
        String token = json.readTree(response.getResponse().getContentAsString()).get("token").asText();
        assertThat(jwt.verify(token).get("sessionVersion", Integer.class)).isEqualTo(4);
        mvc.perform(get("/auth/session").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("CUSTOMER"));
        assertThat(first.session().isInvalid()).isTrue();
        exchange(code, new MockHttpSession(), ORIGIN).andExpect(status().isUnauthorized());

        var second = start();
        String expired = validCode(second, identity("tutor@gmail.com", "google-tutor"));
        when(clock.instant()).thenReturn(CLOCK_START.plusSeconds(120));
        exchange(expired, second.session(), ORIGIN).andExpect(status().isUnauthorized());
    }

    @Test
    void bindsSubjectPreservesPrivilegedRolesAndRechecksRevocation() throws Exception {
        User admin = account("admin@gmail.com", UserRole.ADMIN, true, 8);
        account("owner@gmail.com", UserRole.PARTNER, true, 3);

        var first = start();
        String adminCode = validCode(first, identity("admin@gmail.com", "google-admin"));
        exchange(adminCode, first.session(), ORIGIN).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN")).andExpect(jsonPath("$.id").value(admin.getId().toString()));
        assertThat(users.findById(admin.getId()).orElseThrow().getGoogleSubject()).isEqualTo("google-admin");

        denied(identity("admin@gmail.com", "other-subject"));
        denied(identity("owner@gmail.com", "google-admin"));

        var owner = start();
        String ownerCode = validCode(owner, identity("owner@gmail.com", "google-owner"));
        exchange(ownerCode, owner.session(), ORIGIN).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PARTNER"));

        var revoked = start();
        String revokedCode = validCode(revoked, identity("admin@gmail.com", "google-admin"));
        db.update("update users set session_version = session_version + 1 where id = ?", admin.getId());
        exchange(revokedCode, revoked.session(), ORIGIN).andExpect(status().isUnauthorized());
        var inactive = start();
        String inactiveCode = validCode(inactive, identity("admin@gmail.com", "google-admin"));
        db.update("update users set active = false where id = ?", admin.getId());
        exchange(inactiveCode, inactive.session(), ORIGIN).andExpect(status().isUnauthorized());
        denied(identity("admin@gmail.com", "google-admin"));
    }

    @Test
    void rejectsIneligibleAccountsWithoutRegistrationOrAmbiguousLinking() throws Exception {
        account("team@gmail.com", UserRole.TEAM_MEMBER, true, 0);
        account("tutor@gmail.com", UserRole.CUSTOMER, true, 0);
        account("TUTOR@gmail.com", UserRole.CUSTOMER, true, 0);
        account("not-listed@gmail.com", UserRole.CUSTOMER, true, 0);
        account("legacy@example.test", UserRole.CUSTOMER, true, 0);
        account("staff@example.test", UserRole.PARTNER, true, 0);
        denied(identity("team@gmail.com", "team-subject"));
        denied(identity("tutor@gmail.com", "duplicate-email"));
        denied(identity("not-listed@gmail.com", "unlisted"));
        denied(identity("missing@gmail.com", "missing"));
        denied(identity("legacy@example.test", "non-authoritative"));
        denied(new Identity("staff@example.test", "unverified", "example.test", false));
        assertThat(users.findByEmail("missing@gmail.com")).isEmpty();
        var workspace = start();
        String code = validCode(workspace, new Identity("staff@example.test", "workspace-subject", "example.test", true));
        exchange(code, workspace.session(), ORIGIN).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("PARTNER"));
    }

    private User account(String email, UserRole role, boolean active, int version) {
        return users.save(User.builder().name("Conta de teste").email(email).role(role)
                .active(active).sessionVersion(version).build());
    }

    private Start start() throws Exception {
        var result = mvc.perform(get(AUTHORIZE).servletPath(AUTHORIZE))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, org.hamcrest.Matchers.containsString("no-store")))
                .andReturn();
        String redirect = result.getResponse().getRedirectedUrl();
        return new Start((MockHttpSession) result.getRequest().getSession(false), redirect,
                parse(URI.create(redirect).getRawQuery()));
    }

    private MvcResult callback(Start start, Identity identity, String invalid) throws Exception {
        PROVIDER.grant.set(new ProviderGrant(start.params().get("nonce"), start.params().get("code_challenge"), identity, invalid));
        return mvc.perform(get(CALLBACK).servletPath(CALLBACK).session(start.session())
                        .param("state", start.params().get("state")).param("code", "local-provider-code"))
                .andExpect(status().is3xxRedirection()).andReturn();
    }

    private void denied(Identity identity) throws Exception {
        var result = callback(start(), identity, "");
        assertThat(result.getResponse().getRedirectedUrl()).isEqualTo(ORIGIN + "/login?error=google_failed");
    }

    private String validCode(Start start, Identity identity) throws Exception {
        String location = callback(start, identity, "").getResponse().getRedirectedUrl();
        String prefix = ORIGIN + "/login-success#code=";
        assertThat(location).startsWith(prefix);
        String code = location.substring(prefix.length());
        assertThat(code).matches("[A-Za-z0-9_-]{43}");
        return code;
    }

    private org.springframework.test.web.servlet.ResultActions exchange(String code, MockHttpSession session, String origin)
            throws Exception {
        return mvc.perform(post(EXCHANGE).servletPath(EXCHANGE).session(session)
                .header(HttpHeaders.ORIGIN, origin).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", code))));
    }

    private static Identity identity(String email, String subject) {
        return new Identity(email, subject, null, true);
    }

    private static Map<String, String> parse(String query) {
        var values = new LinkedHashMap<String, String>();
        for (String pair : query.split("&")) {
            String[] entry = pair.split("=", 2);
            values.put(entry[0], URLDecoder.decode(entry[1], StandardCharsets.UTF_8));
        }
        return values;
    }

    private record Start(MockHttpSession session, String redirect, Map<String, String> params) {}
    private record Identity(String email, String subject, String hostedDomain, boolean verified) {}
    private record ProviderGrant(String nonce, String challenge, Identity identity, String invalid) {}

    private static final class Provider {
        private final HttpServer server;
        private final java.security.KeyPair keys = Jwts.SIG.RS256.keyPair().build();
        private final java.security.KeyPair wrongKeys = Jwts.SIG.RS256.keyPair().build();
        private final AtomicReference<ProviderGrant> grant = new AtomicReference<>();
        private final ObjectMapper json = new ObjectMapper();

        Provider() {
            try {
                server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            } catch (java.io.IOException ex) {
                throw new IllegalStateException(ex);
            }
            server.createContext("/token", request -> {
                try (request) {
                    ProviderGrant pending = grant.getAndSet(null);
                    var form = parse(new String(request.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                    String verifier = form.getOrDefault("code_verifier", "");
                    String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(
                            MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.UTF_8)));
                    if (pending == null || !pending.challenge().equals(challenge) || !REDIRECT.equals(form.get("redirect_uri"))) {
                        write(request, 400, Map.of("error", "invalid_grant"));
                        return;
                    }
                    var identity = pending.identity();
                    Instant now = Instant.now();
                    var token = Jwts.builder().header().keyId("fixture").and()
                            .issuer(pending.invalid().equals("issuer") ? origin() + "/other" : origin())
                            .audience().add(pending.invalid().equals("audience") ? "other-client" : CLIENT).and()
                            .subject(identity.subject()).claim("email", identity.email()).claim("email_verified", identity.verified())
                            .claim("nonce", pending.invalid().equals("nonce") ? "invalid-nonce" : pending.nonce())
                            .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(120)));
                    if (identity.hostedDomain() != null) token.claim("hd", identity.hostedDomain());
                    var key = pending.invalid().equals("signature") ? wrongKeys.getPrivate() : keys.getPrivate();
                    write(request, 200, Map.of("access_token", "fixture", "token_type", "Bearer", "expires_in", 120,
                            "id_token", token.signWith(key, Jwts.SIG.RS256).compact()));
                } catch (Exception ex) {
                    throw new IllegalStateException(ex);
                }
            });
            server.createContext("/jwks", request -> {
                try (request) {
                    var key = (RSAPublicKey) keys.getPublic();
                    var jwk = Map.of("kty", "RSA", "kid", "fixture", "alg", "RS256", "use", "sig",
                            "n", encodeNumber(key.getModulus()), "e", encodeNumber(key.getPublicExponent()));
                    write(request, 200, Map.of("keys", java.util.List.of(jwk)));
                }
            });
            server.start();
        }

        String origin() { return "http://127.0.0.1:" + server.getAddress().getPort(); }

        void close() { server.stop(0); }

        private void write(com.sun.net.httpserver.HttpExchange request, int status, Map<String, ?> payload)
                throws java.io.IOException {
            byte[] bytes = json.writeValueAsBytes(payload);
            request.getResponseHeaders().set("Content-Type", "application/json");
            request.sendResponseHeaders(status, bytes.length);
            request.getResponseBody().write(bytes);
        }

        private String encodeNumber(java.math.BigInteger number) {
            byte[] bytes = number.toByteArray();
            if (bytes[0] == 0) bytes = java.util.Arrays.copyOfRange(bytes, 1, bytes.length);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        }
    }
}
