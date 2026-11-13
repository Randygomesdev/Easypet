package br.com.easypet.payment.cashier;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfEnvironmentVariable(named = "S05_TEST_DB_URL", matches = ".+")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1",
        "spring.jpa.show-sql=false",
        "app.checkout-enabled=false",
        "app.package-credits-enabled=false"
})
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class CashierLedgerPostgresTest {
    private static final String BASE = "/payments/cashier";
    private static final Map<String, String> SESSIONS = new ConcurrentHashMap<>();
    private static final Map<String, Integer> SESSION_STATUSES = new ConcurrentHashMap<>();
    private static final UUID PARTNER_A = UUID.randomUUID();
    private static final UUID PARTNER_B = UUID.randomUUID();
    private static final UUID PARTNER_C = UUID.randomUUID();
    private static final UUID TEAM_PARTNER = UUID.randomUUID();
    private static final UUID INACTIVE = UUID.randomUUID();
    private static final UUID USER_A = UUID.randomUUID();
    private static final UUID USER_B = UUID.randomUUID();
    private static final UUID USER_C = UUID.randomUUID();
    private static final String TOKEN_A = token(USER_A, "PARTNER");
    private static final String TOKEN_B = token(USER_B, "PARTNER");
    private static final String TOKEN_C = token(USER_C, "PARTNER");
    private static final String TOKEN_INACTIVE = token(UUID.randomUUID(), "PARTNER");
    private static final UUID OTHER_BOOKING = UUID.randomUUID();
    private static final UUID CANCELLED_BOOKING = UUID.randomUUID();
    private static final UUID PREPAID_BOOKING = UUID.randomUUID();
    private static final UUID UNAVAILABLE_BOOKING = UUID.randomUUID();
    private static HttpServer dependencies;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcClient jdbc;
    @LocalServerPort int port;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry properties) throws IOException {
        dependencies = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        dependencies.createContext("/auth/session", request -> {
            String bearer = request.getRequestHeaders().getFirst(AUTHORIZATION);
            String session = SESSIONS.getOrDefault(bearer, "{}");
            int status = SESSION_STATUSES.getOrDefault(bearer, SESSIONS.containsKey(bearer) ? 200 : 401);
            if (status == 302) request.getResponseHeaders().set("Location", "/session-redirect");
            respond(request, status, session);
        });
        dependencies.createContext("/session-redirect", request ->
                respond(request, 200, SESSIONS.get(request.getRequestHeaders().getFirst(AUTHORIZATION))));
        dependencies.createContext("/partners/me", request -> {
            String token = request.getRequestHeaders().getFirst(AUTHORIZATION);
            if (TOKEN_A.equals(token)) respond(request, 200, "{\"id\":\"" + PARTNER_A + "\"}");
            else if (TOKEN_B.equals(token)) respond(request, 200, "{\"id\":\"" + PARTNER_B + "\"}");
            else if (TOKEN_C.equals(token)) respond(request, 200, "{\"id\":\"" + PARTNER_C + "\"}");
            else if (TOKEN_INACTIVE.equals(token)) respond(request, 200, "{\"id\":\"" + INACTIVE + "\"}");
            else respond(request, 403, "{}");
        });
        dependencies.createContext("/partners/catalog/", request -> {
            UUID id = UUID.fromString(request.getRequestURI().getPath().substring("/partners/catalog/".length()));
            if (!SESSIONS.containsKey(request.getRequestHeaders().getFirst(AUTHORIZATION))) {
                respond(request, 401, "{}");
                return;
            }
            respond(request, id.equals(INACTIVE) ? 404 : 200, "{\"id\":\"" + id + "\"}");
        });
        dependencies.createContext("/bookings/", request -> {
            UUID id = UUID.fromString(request.getRequestURI().getPath().substring("/bookings/".length()));
            String token = request.getRequestHeaders().getFirst(AUTHORIZATION);
            String session = SESSIONS.get(token);
            UUID partner = session != null && session.contains(TEAM_PARTNER.toString()) ? TEAM_PARTNER
                    : TOKEN_C.equals(token) ? PARTNER_C : OTHER_BOOKING.equals(id) ? PARTNER_B : PARTNER_A;
            if (OTHER_BOOKING.equals(id)) partner = PARTNER_B;
            String status = CANCELLED_BOOKING.equals(id) ? "CANCELLED" : "COMPLETED";
            String method = PREPAID_BOOKING.equals(id) ? "PACKAGE_CREDIT" : "CARD";
            respond(request, UNAVAILABLE_BOOKING.equals(id) ? 503 : 200, """
                    {"id":"%s","partnerId":"%s","status":"%s","paymentMethod":"%s"}
                    """.formatted(id, partner, status, method));
        });
        dependencies.start();
        String dependencyUrl = "http://127.0.0.1:" + dependencies.getAddress().getPort();
        properties.add("spring.datasource.url", () -> System.getenv("S05_TEST_DB_URL"));
        properties.add("spring.datasource.username", () -> System.getenv("S05_TEST_DB_USER"));
        properties.add("spring.datasource.password", () -> System.getenv("S05_TEST_DB_PASSWORD"));
        properties.add("services.partner-service.url", () -> dependencyUrl);
        properties.add("services.booking-service.url", () -> dependencyUrl);
        properties.add("services.auth-service.url", () -> dependencyUrl);
    }

    @AfterAll
    static void stopDependencies() {
        if (dependencies != null) dependencies.stop(0);
    }

    @Test
    void realHttpDistinguishesDeniedRoleFromMissingOrInvalidJwt() throws Exception {
        String charge = id(command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(UUID.randomUUID())));
        URI uri = URI.create("http://127.0.0.1:" + port + "/api/v1" + BASE + "/charges/" + charge);
        try (var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            var denied = getCharge(http, uri, token(UUID.randomUUID(), "CUSTOMER"));
            assertThat(denied.statusCode()).isEqualTo(403);
            assertThat(denied.headers().firstValue("Content-Type")).hasValueSatisfying(
                    value -> assertThat(value).startsWith(APPLICATION_JSON.toString()));
            assertThat(json.readTree(denied.body()).get("status").asInt()).isEqualTo(403);

            assertThat(getCharge(http, uri, null).statusCode()).isEqualTo(401);
            assertThat(getCharge(http, uri, "Bearer invalid").statusCode()).isEqualTo(401);
            assertThat(getCharge(http, uri, TOKEN_B).statusCode()).isEqualTo(404);
            var authorized = getCharge(http, uri, TOKEN_A);
            assertThat(authorized.statusCode()).isEqualTo(200);
            assertThat(json.readTree(authorized.body()).at("/charge/id").asText()).isEqualTo(charge);
        }
    }

    @Test
    void onlyAcceptsAnAuth200AndRechecksEveryProtectedRequest() throws Exception {
        String actor = token(UUID.randomUUID(), "CUSTOMER");
        URI uri = URI.create("http://127.0.0.1:" + port + "/api/v1/payments/credits/balance");
        try (var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            assertThat(getCharge(http, uri, actor).statusCode()).isEqualTo(200);
            for (int status : List.of(202, 204, 302, 503, 403)) {
                SESSION_STATUSES.put(actor, status);
                assertThat(getCharge(http, uri, actor).statusCode()).as("Auth HTTP %s", status).isEqualTo(503);
            }
            SESSION_STATUSES.remove(actor);
            SESSIONS.put(actor, "{\"role\":\"CUSTOMER\"}");
            assertThat(getCharge(http, uri, actor).statusCode()).isEqualTo(503);
            SESSIONS.remove(actor);
            assertThat(getCharge(http, uri, actor).statusCode()).isEqualTo(401);
        }
    }

    @Test
    void enforcesTeamScopePermissionsAndIndividualAuditAndRejectsRevocation(CapturedOutput output) throws Exception {
        UUID receptionistId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        String reception = teamToken(receptionistId, TEAM_PARTNER, "RECEPTION", "\"CASH_RECEIVE\"");
        String manager = teamToken(managerId, TEAM_PARTNER, "MANAGER", "\"CASH_RECEIVE\",\"CASH_CLOSE\"");
        String professional = teamToken(UUID.randomUUID(), TEAM_PARTNER, "PROFESSIONAL", "\"BOOKINGS_ASSIGNED_READ\"");
        String foreignReception = teamToken(UUID.randomUUID(), PARTNER_A, "RECEPTION", "\"CASH_RECEIVE\"");
        String foreignManager = teamToken(UUID.randomUUID(), PARTNER_A, "MANAGER", "\"CASH_RECEIVE\",\"CASH_CLOSE\"");
        read(reception, "/context").andExpect(jsonPath("$.actorId").value(receptionistId.toString()))
                .andExpect(jsonPath("$.partnerId").value(TEAM_PARTNER.toString()))
                .andExpect(jsonPath("$.canReceive").value(true)).andExpect(jsonPath("$.canClose").value(false));
        mvc.perform(get(BASE + "/context").header(AUTHORIZATION, professional)
                .header("X-User-Role", "PARTNER").header("X-Partner-Id", TEAM_PARTNER)).andExpect(status().isForbidden());
        mvc.perform(get(BASE + "/days").header(AUTHORIZATION, reception)).andExpect(status().isForbidden());
        mvc.perform(get("/payments/credits/balance").header(AUTHORIZATION, reception)).andExpect(status().isForbidden());
        command(reception, "/charges", UUID.randomUUID(), chargeBody(OTHER_BOOKING)).andExpect(status().isNotFound());
        String charge = id(command(reception, "/charges", UUID.randomUUID(), chargeBody(UUID.randomUUID())));
        String chargePath = "/charges/" + charge;
        UUID key = UUID.randomUUID();
        String receipt = id(command(reception, chargePath + "/receipts", key, receipt("PIX", 4000)));
        String reversePath = "/receipts/" + receipt + "/reverse";
        String reason = "{\"reason\":\"Correção de lançamento\"}";
        command(reception, reversePath, UUID.randomUUID(), reason).andExpect(status().isForbidden());
        command(professional, reversePath, UUID.randomUUID(), reason).andExpect(status().isForbidden());
        command(foreignManager, reversePath, UUID.randomUUID(), reason).andExpect(status().isNotFound());
        mvc.perform(get(BASE + chargePath).header(AUTHORIZATION, foreignReception)).andExpect(status().isNotFound());
        command(foreignReception, chargePath + "/receipts", UUID.randomUUID(), receipt("CASH", 100))
                .andExpect(status().isNotFound());
        String date = json.readTree(read(manager, "/days").andReturn().getResponse().getContentAsString())
                .get("date").asText();
        command(reception, "/days/" + date + "/close", UUID.randomUUID(), null).andExpect(status().isForbidden());
        var adjustment = mvc.perform(post(BASE + reversePath).header(AUTHORIZATION, manager)
                .header("Idempotency-Key", UUID.randomUUID()).header("X-Request-Id", "h1-audit-fixture")
                .contentType(APPLICATION_JSON).content(reason));
        String reversal = id(adjustment);
        assertThat(adjustment.andReturn().getResponse().getHeader("X-Request-Id")).isEqualTo("h1-audit-fixture");
        assertThat(output.getAll()).contains("cashier_request requestId=h1-audit-fixture operation=reverse status=200")
                .doesNotContain("Correção de lançamento", manager, receipt, reversal);
        String closing = id(command(manager, "/days/" + date + "/close", UUID.randomUUID(), null));
        read(manager, "/days").andExpect(jsonPath("$.closedBy").value(managerId.toString()))
                .andExpect(jsonPath("$.closingId").value(closing));
        read(reception, "/context").andExpect(jsonPath("$.closedToday").value(true));
        read(reception, chargePath).andExpect(jsonPath("$.charge.createdBy").value(receptionistId.toString()))
                .andExpect(jsonPath("$.movements[0].createdBy").value(managerId.toString()))
                .andExpect(jsonPath("$.movements[0].reversesReceiptId").value(receipt))
                .andExpect(jsonPath("$.movements[0].id").value(reversal))
                .andExpect(jsonPath("$.movements[1].createdBy").value(receptionistId.toString()));
        assertThat(id(command(reception, chargePath + "/receipts", key, receipt("PIX", 4000)))).isEqualTo(receipt);
        SESSIONS.remove(reception);
        command(reception, chargePath + "/receipts", key, receipt("PIX", 4000)).andExpect(status().isUnauthorized());
    }

    private static HttpResponse<String> getCharge(HttpClient http, URI uri, String token)
            throws IOException, InterruptedException {
        var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10)).GET();
        if (token != null) request.header(AUTHORIZATION, token);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void validatesIdentityScopeAndBookingBeforeCreatingCharge() throws Exception {
        mvc.perform(get(BASE + "/days")).andExpect(status().isUnauthorized());
        mvc.perform(get(BASE + "/days").header(AUTHORIZATION, token(UUID.randomUUID(), "CUSTOMER")))
                .andExpect(status().isForbidden());
        mvc.perform(get(BASE + "/days").header(AUTHORIZATION, token(UUID.randomUUID(), "ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(get(BASE + "/days").header(AUTHORIZATION, TOKEN_INACTIVE)).andExpect(status().isNotFound());
        String inactiveTeam = teamToken(UUID.randomUUID(), INACTIVE, "MANAGER", "\"CASH_RECEIVE\",\"CASH_CLOSE\"");
        mvc.perform(get(BASE + "/context").header(AUTHORIZATION, inactiveTeam)).andExpect(status().isNotFound());
        command(inactiveTeam, "/charges", UUID.randomUUID(), chargeBody(UUID.randomUUID())).andExpect(status().isNotFound());
        command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(OTHER_BOOKING)).andExpect(status().isNotFound());
        command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(CANCELLED_BOOKING)).andExpect(status().isConflict());
        command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(PREPAID_BOOKING)).andExpect(status().isConflict());
        command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(UNAVAILABLE_BOOKING))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void validatesInputWithoutRoundingCents() throws Exception {
        mvc.perform(post(BASE + "/charges").header(AUTHORIZATION, TOKEN_A)
                .contentType(APPLICATION_JSON).content(chargeBody(UUID.randomUUID())))
                .andExpect(status().isBadRequest());
        command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(UUID.randomUUID()).replace("9000", "90.25"))
                .andExpect(status().isBadRequest());
        command(TOKEN_A, "/charges", UUID.randomUUID(),
                chargeBody(UUID.randomUUID()).replace("\"discountCents\":500", "\"discountCents\":99999"))
                .andExpect(status().isBadRequest());
        mvc.perform(get(BASE + "/days").header(AUTHORIZATION, TOKEN_A).param("size", "101"))
                .andExpect(status().isBadRequest());
        mvc.perform(get(BASE + "/days").header(AUTHORIZATION, TOKEN_A).param("date", "13/11/2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registersPartialReceiptsAndReversalAndIsolatesResources() throws Exception {
        UUID booking = UUID.randomUUID();
        UUID chargeKey = UUID.randomUUID();
        String charge = id(command(TOKEN_A, "/charges", chargeKey, chargeBody(booking)));
        assertThat(id(command(TOKEN_A, "/charges", chargeKey, chargeBody(booking)))).isEqualTo(charge);
        command(TOKEN_A, "/charges", UUID.randomUUID(), chargeBody(booking)).andExpect(status().isConflict());
        read(TOKEN_A, "/charges/" + charge).andExpect(jsonPath("$.charge.totalCents").value(10000))
                .andExpect(jsonPath("$.charge.receivedCents").value(0));

        String path = "/charges/" + charge + "/receipts";
        UUID receiptKey = UUID.randomUUID();
        var receiptIds = concurrent(
                () -> id(command(TOKEN_A, path, receiptKey, receipt("PIX", 4000))),
                () -> id(command(TOKEN_A, path, receiptKey, receipt("PIX", 4000))));
        String pix = receiptIds.getFirst();
        assertThat(receiptIds.getLast()).isEqualTo(pix);
        command(TOKEN_A, path, receiptKey, receipt("PIX", 4001)).andExpect(status().isConflict());
        command(TOKEN_A, path, UUID.randomUUID(), receipt("CASH", 6001)).andExpect(status().isConflict());
        id(command(TOKEN_A, path, UUID.randomUUID(), receipt("CASH", 2000)));
        read(TOKEN_A, "/charges/" + charge).andExpect(jsonPath("$.charge.balanceCents").value(4000));
        read(TOKEN_B, "/charges/" + charge).andExpect(status().isNotFound());
        command(TOKEN_B, path, UUID.randomUUID(), receipt("PIX", 10)).andExpect(status().isNotFound());
        command(TOKEN_B, "/receipts/" + pix + "/reverse", UUID.randomUUID(), "{\"reason\":\"Teste\"}")
                .andExpect(status().isNotFound());

        UUID reversalKey = UUID.randomUUID();
        String reversePath = "/receipts/" + pix + "/reverse";
        String reason = "{\"reason\":\"Forma informada incorretamente\"}";
        String reversal = id(command(TOKEN_A, reversePath, reversalKey, reason));
        assertThat(id(command(TOKEN_A, reversePath, reversalKey, reason))).isEqualTo(reversal);
        command(TOKEN_A, reversePath, UUID.randomUUID(), reason).andExpect(status().isConflict());
        read(TOKEN_A, "/charges/" + charge)
                .andExpect(jsonPath("$.charge.balanceCents").value(8000))
                .andExpect(jsonPath("$.movements[0].reversesReceiptId").value(pix))
                .andExpect(jsonPath("$.movements[0].createdBy").value(USER_A.toString()))
                .andExpect(jsonPath("$.movements[0].reason").value("Forma informada incorretamente"));
        read(TOKEN_B, "/charges").andExpect(jsonPath("$.content").isEmpty());
        read(TOKEN_B, "/days").andExpect(jsonPath("$.totals.netCents").value(0));
    }

    @Test
    void serializesConcurrentReceiptsAndClosingAndKeepsClosedDayImmutable() throws Exception {
        String charge = id(command(TOKEN_C, "/charges", UUID.randomUUID(), chargeBody(UUID.randomUUID())));
        String path = "/charges/" + charge + "/receipts";
        LocalDate today = LocalDate.parse(json.readTree(read(TOKEN_C, "/days").andReturn()
                .getResponse().getContentAsString()).get("date").asText());
        LocalDate yesterday = today.minusDays(1);

        UUID previousKey = UUID.randomUUID();
        String old = id(command(TOKEN_C, path, previousKey, receipt("PIX", 1000)));
        jdbc.sql("""
                UPDATE cashier_movements SET business_date = :yesterday, created_at = created_at - INTERVAL '1 day'
                WHERE id = :receipt
                """).param("yesterday", yesterday).param("receipt", UUID.fromString(old)).update();
        String closeYesterday = "/days/" + yesterday + "/close";
        var closingIds = concurrent(
                () -> id(command(TOKEN_C, closeYesterday, UUID.randomUUID(), null)),
                () -> id(command(TOKEN_C, closeYesterday, UUID.randomUUID(), null)));
        assertThat(closingIds.getFirst()).isEqualTo(closingIds.getLast());
        id(command(TOKEN_C, "/receipts/" + old + "/reverse", UUID.randomUUID(), "{\"reason\":\"Acerto de ontem\"}"));
        assertThat(id(command(TOKEN_C, path, previousKey, receipt("PIX", 1000)))).isEqualTo(old);
        read(TOKEN_C, "/days?date=" + yesterday).andExpect(jsonPath("$.totals.byMethod.PIX").value(1000))
                .andExpect(jsonPath("$.totals.adjustmentCents").value(0))
                .andExpect(jsonPath("$.closingId").value(closingIds.getFirst()));

        var receiptStatuses = concurrent(
                () -> responseStatus(command(TOKEN_C, path, UUID.randomUUID(), receipt("DEBIT_CARD", 7000))),
                () -> responseStatus(command(TOKEN_C, path, UUID.randomUUID(), receipt("CASH", 7000))));
        assertThat(receiptStatuses).containsExactlyInAnyOrder(200, 409);

        UUID lastReceiptKey = UUID.randomUUID();
        String closePath = "/days/" + today + "/close";
        var race = concurrent(
                () -> responseStatus(command(TOKEN_C, path, lastReceiptKey, receipt("PIX", 3000))),
                () -> responseStatus(command(TOKEN_C, closePath, UUID.randomUUID(), null)));
        assertThat(race.get(1)).isEqualTo(200);
        assertThat(race.getFirst()).isIn(200, 409);
        long newReceipt = race.getFirst() == 200 ? 3000 : 0;

        command(TOKEN_C, path, UUID.randomUUID(), receipt("PIX", 1)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CASHIER_DAY_CLOSED"));
        assertThat(responseStatus(command(TOKEN_C, path, lastReceiptKey, receipt("PIX", 3000))))
                .isEqualTo(race.getFirst());
        read(TOKEN_C, "/days").andExpect(jsonPath("$.closedBy").value(USER_C.toString()))
                .andExpect(jsonPath("$.totals.receivedCents").value(7000 + newReceipt))
                .andExpect(jsonPath("$.totals.adjustmentCents").value(-1000))
                .andExpect(jsonPath("$.totals.netCents").value(6000 + newReceipt))
                .andExpect(jsonPath("$.totals.byMethod.PIX").value(newReceipt - 1000));
    }

    private <T> List<T> concurrent(Callable<T> first, Callable<T> second) throws Exception {
        var start = new CountDownLatch(1);
        try (var threads = Executors.newFixedThreadPool(2)) {
            var left = threads.submit(() -> { start.await(); return first.call(); });
            var right = threads.submit(() -> { start.await(); return second.call(); });
            start.countDown();
            return List.of(left.get(10, TimeUnit.SECONDS), right.get(10, TimeUnit.SECONDS));
        }
    }

    private ResultActions command(String token, String path, UUID key, String body) throws Exception {
        MockHttpServletRequestBuilder request = post(BASE + path).header(AUTHORIZATION, token)
                .header("Idempotency-Key", key.toString());
        if (body != null) request.contentType(APPLICATION_JSON).content(body);
        return mvc.perform(request);
    }

    private ResultActions read(String token, String path) throws Exception {
        return mvc.perform(get(BASE + path).header(AUTHORIZATION, token));
    }

    private String id(ResultActions result) throws Exception {
        return json.readTree(result.andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
                .get("id").asText();
    }

    private static int responseStatus(ResultActions result) {
        return result.andReturn().getResponse().getStatus();
    }

    private static String chargeBody(UUID booking) {
        return """
                {"bookingId":"%s","description":"Banho e tosa","baseCents":9000,"extrasCents":1500,"discountCents":500}
                """.formatted(booking);
    }

    private static String receipt(String method, long cents) {
        return "{\"method\":\"%s\",\"amountCents\":%d}".formatted(method, cents);
    }

    private static String token(UUID userId, String role) {
        return registerSession("""
                {"userId":"%s","role":"%s","partnerId":null,"accessRole":null,"permissions":[]}
                """.formatted(userId, role));
    }

    private static String teamToken(UUID userId, UUID partnerId, String accessRole, String permissions) {
        return registerSession("""
                {"userId":"%s","role":"TEAM_MEMBER","partnerId":"%s","accessRole":"%s","permissions":[%s]}
                """.formatted(userId, partnerId, accessRole, permissions));
    }

    private static String registerSession(String session) {
        String bearer = "Bearer " + UUID.randomUUID();
        SESSIONS.put(bearer, session);
        return bearer;
    }

    private static void respond(com.sun.net.httpserver.HttpExchange request, int status, String response)
            throws IOException {
        try (request) {
            byte[] body = response.getBytes(StandardCharsets.UTF_8);
            request.getResponseHeaders().set("Content-Type", "application/json");
            request.sendResponseHeaders(status, status == 204 ? -1 : body.length);
            if (status != 204) request.getResponseBody().write(body);
        }
    }
}
