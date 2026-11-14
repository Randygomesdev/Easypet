package br.com.easypet.booking.service;

import br.com.easypet.booking.repository.BookingAgendaStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.InterceptingClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=${S03_POSTGRES_URL}",
        "spring.datasource.username=${S03_POSTGRES_USER:booking_s03}",
        "spring.datasource.password=${S03_POSTGRES_PASSWORD:booking_s03_local}",
        "app.http.connect-timeout=500ms",
        "app.http.read-timeout=2500ms",
        "app.booking-pet-summary-token=pet-summary-test-only",
        "app.booking-payment-authorization-token=payment-authorization-test-only",
        "app.booking-agenda-lock-timeout=4s",
        "app.booking-tutor-notice-minutes=90",
        "spring.transaction.default-timeout=8s"
})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "S03_POSTGRES_URL", matches = "jdbc:postgresql:.*")
class BookingDependencyPostgresTest {
    static final String SECRET = "local-test-only-booking-http-dependencies-key";

    private static final AtomicReference<BookingDependencyPostgresTest> SCENARIO = new AtomicReference<>();
    private static HttpServer server;
    private static ExecutorService httpThreads;

    @Autowired MockMvc http;
    @Autowired Clock clock;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired BookingAgendaStore agenda;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean org.springframework.web.client.RestTemplate restTemplate;
    @LocalServerPort int bookingPort;

    private final UUID partnerId = UUID.randomUUID();
    private final UUID tutorId = UUID.randomUUID();
    private final UUID petId = UUID.randomUUID();
    private final UUID stalledPetId = UUID.randomUUID();
    private final UUID serviceId = UUID.randomUUID();
    private final UUID staffId = UUID.randomUUID();
    private final UUID boardingId = UUID.randomUUID();
    private final UUID receptionId = UUID.randomUUID();
    private final UUID professionalId = UUID.randomUUID();
    private final UUID receptionistId = UUID.randomUUID();
    private final UUID otherPartner = UUID.randomUUID();
    private final UUID otherStaff = UUID.randomUUID();
    private final UUID otherTutorId = UUID.randomUUID();
    private volatile int authStatus = 200;
    private volatile boolean authStalled;
    private final CountDownLatch authRequestArrived = new CountDownLatch(1);
    private final CountDownLatch releaseAuth = new CountDownLatch(1);
    private volatile boolean claimLinked;
    private volatile boolean partnerActive = true;
    private final CountDownLatch partialResponse = new CountDownLatch(1);
    private final CountDownLatch releaseResponse = new CountDownLatch(1);
    private LocalDateTime date;

    @DynamicPropertySource
    static void upstreamUrls(DynamicPropertyRegistry properties) throws IOException {
        httpThreads = Executors.newVirtualThreadPerTaskExecutor();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(httpThreads);
        server.createContext("/api/v1", exchange -> SCENARIO.get().serve(exchange));
        server.start();
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1";
        properties.add("PET_SERVICE_URL", () -> url);
        properties.add("services.partner-service.url", () -> url);
        properties.add("services.auth-service.url", () -> url);
    }

    @AfterAll
    static void stopHttpServer() {
        if (server != null) server.stop(0);
        if (httpThreads != null) httpThreads.shutdownNow();
    }

    @BeforeEach
    void setup() {
        date = LocalDateTime.now(clock).toLocalDate().plusDays(3).atTime(10, 0);
        SCENARIO.set(this);
    }

    @Test
    void interruptedVisitKeepsAuditExpiresOffersAndReleasesItsSlotExactlyOnce() throws Exception {
        String id = visitInProgress();
        String root = "/bookings/" + id;
        String operator = auth("PROFESSIONAL");
        String proposalId = proposeExtra(root, operator, "first-offer");
        create(petId, "before-interruption", date).andExpect(status().isConflict());
        http.perform(patch(root + "/status").header("Authorization", operator).param("status", "INTERRUPTED"))
                .andExpect(status().isBadRequest());
        http.perform(post(root + "/interrupt").header("Authorization", auth("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Pedido do tutor\"}"))
                .andExpect(status().isForbidden());
        http.perform(post(root + "/interrupt").header("Authorization", operator)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"  \"}"))
                .andExpect(status().isBadRequest());
        String control = "{\"reason\":\"Pedido do tutor\"}";
        String interruptedAt = field(http.perform(post(root + "/interrupt").header("Authorization", operator)
                        .contentType(MediaType.APPLICATION_JSON).content(control))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("INTERRUPTED")), "interruptedAt");
        http.perform(post(root + "/interrupt").header("Authorization", operator)
                        .contentType(MediaType.APPLICATION_JSON).content(control))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interruptedAt").value(interruptedAt));
        http.perform(post(root + "/interrupt").header("Authorization", auth("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content(control)).andExpect(status().isConflict());
        http.perform(post(root + "/extras/" + proposalId + "/decisions/digital").header("Authorization", auth("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":1,\"decision\":\"APPROVE\"}"))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM booking_outbox WHERE booking_id=? AND event_type='BOOKING_INTERRUPTED'",
                Integer.class, UUID.fromString(id))).isEqualTo(1);
        create(petId, "after-interruption", date).andExpect(status().isCreated());
        String investigation = "/admin/bookings/investigations";
        http.perform(get(investigation).header("Authorization", auth("PARTNER"))).andExpect(status().isForbidden());
        http.perform(get(investigation).header("Authorization", auth("ADMIN")).param("partnerId", partnerId.toString())
                        .param("size", "1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].bookingId").value(id)).andExpect(jsonPath("$.totalElements").value(1));
        http.perform(get(investigation + "/" + id).header("Authorization", auth("ADMIN")).param("partnerId", otherPartner.toString()))
                .andExpect(status().isNotFound());
        http.perform(get(investigation + "/" + id).header("Authorization", auth("ADMIN")).param("historySize", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reason").value("Pedido do tutor"))
                .andExpect(jsonPath("$.history.content[0].actorId").value(professionalId.toString()))
                .andExpect(jsonPath("$.extras.content[0].extra.status").value("EXPIRED"));
    }

    @Test
    void extrasRequireAnAuthoritativeDecisionAndSerializeCompetingAcceptances() throws Exception {
        String id = visitInProgress();
        String root = "/bookings/" + id;
        String professional = auth("PROFESSIONAL");
        String extraId = proposeExtra(root, professional, "extra-key");
        assertThat(proposeExtra(root, professional, "extra-key")).isEqualTo(extraId);
        String decisions = root + "/extras/" + extraId + "/decisions/";
        String approved = "{\"version\":1,\"decision\":\"APPROVE\"}";
        String rejected = "{\"version\":1,\"decision\":\"REJECT\"}";
        String inPerson = "{\"version\":1,\"decision\":\"APPROVE\",\"reason\":\"Tutor conferiu\",\"evidence\":\"Protocolo 41\"}";
        String payment = "/internal/booking-extra-authorizations/" + extraId;
        String paymentAuth = "Bearer payment-authorization-test-only";
        http.perform(get(payment).header("Authorization", auth("ADMIN"))).andExpect(status().isUnauthorized());
        http.perform(get(payment).header("Authorization", paymentAuth).param("bookingId", id)
                        .param("partnerId", partnerId.toString()).param("version", "1")).andExpect(status().isNotFound());
        http.perform(post(decisions + "digital").header("Authorization", professional)
                        .contentType(MediaType.APPLICATION_JSON).content(approved)).andExpect(status().isForbidden());
        http.perform(post(decisions + "digital").header("Authorization", auth("OTHER_TUTOR"))
                        .contentType(MediaType.APPLICATION_JSON).content(approved)).andExpect(status().isNotFound());
        http.perform(post(decisions + "in-person").header("Authorization", professional)
                        .contentType(MediaType.APPLICATION_JSON).content(inPerson)).andExpect(status().isForbidden());
        http.perform(post(decisions + "digital").header("Authorization", auth("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON).content(approved.replace(":1", ":2"))).andExpect(status().isConflict());
        try (var threads = Executors.newVirtualThreadPerTaskExecutor()) {
            var concurrent = threads.submit(() -> http.perform(post(decisions + "digital")
                    .header("Authorization", auth("CUSTOMER")).contentType(MediaType.APPLICATION_JSON).content(rejected))
                    .andReturn().getResponse().getStatus());
            int desk = http.perform(post(decisions + "in-person").header("Authorization", auth("RECEPTION"))
                            .contentType(MediaType.APPLICATION_JSON).content(inPerson)).andReturn().getResponse().getStatus();
            assertThat(java.util.List.of(desk, concurrent.get(5, TimeUnit.SECONDS))).containsExactlyInAnyOrder(200, 409);
        }
        String approvedExtra = proposeExtra(root, professional, "separate-extra");
        String approval = root + "/extras/" + approvedExtra + "/decisions/in-person";
        for (int attempt = 0; attempt < 2; attempt++) {
            http.perform(post(approval).header("Authorization", auth("RECEPTION"))
                            .contentType(MediaType.APPLICATION_JSON).content(inPerson)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.amountCents").value(3000)).andExpect(jsonPath("$.status").value("APPROVED"));
        }
        http.perform(get("/internal/booking-extra-authorizations/" + approvedExtra).header("Authorization", paymentAuth)
                        .param("bookingId", id).param("partnerId", partnerId.toString()).param("version", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.approvedBy").value(receptionistId.toString()))
                .andExpect(jsonPath("$.tutorId").value(tutorId.toString())).andExpect(jsonPath("$.channel").value("IN_PERSON"));
    }

    private String visitInProgress() throws Exception {
        String id = field(create(petId, "for-visit", date).andExpect(status().isCreated()), "id");
        http.perform(patch("/bookings/" + id + "/status").header("Authorization", auth("ADMIN")).param("status", "CONFIRMED"))
                .andExpect(status().isOk());
        http.perform(patch("/bookings/" + id + "/status").header("Authorization", auth("PROFESSIONAL")).param("status", "IN_PROGRESS"))
                .andExpect(status().isOk());
        return id;
    }

    private String proposeExtra(String root, String actor, String key) throws Exception {
        return field(http.perform(post(root + "/extras").header("Authorization", actor).header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"Hidratação\",\"quantity\":2,\"unitPriceCents\":1500}"))
                .andExpect(status().isCreated()), "id");
    }

    private String field(ResultActions response, String field) throws Exception {
        return json.readTree(response.andReturn().getResponse().getContentAsString()).path(field).asText();
    }

    @Test
    void unfinishedResponseRollsBackAndWaiterCanReserveTheSameSlot() throws Exception {
        try (var requests = Executors.newVirtualThreadPerTaskExecutor()) {
            try {
                long started = System.nanoTime();
                var stalled = requests.submit(() -> create(stalledPetId, "stalled", date));
                assertThat(partialResponse.await(5, TimeUnit.SECONDS)).isTrue();

                var next = requests.submit(() -> create(petId, "healthy", date));
                await().atMost(Duration.ofSeconds(2)).until(() -> pendingAgendaWaits() > 0);

                stalled.get(5, TimeUnit.SECONDS).andExpect(status().isServiceUnavailable())
                        .andExpect(jsonPath("$.message").value("Não foi possível consultar o pet. Tente novamente."));
                assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(6));
                next.get(5, TimeUnit.SECONDS).andExpect(status().isCreated())
                        .andExpect(jsonPath("$.scheduledEnd").value(date.plusMinutes(45)
                                .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)));

                assertThat(count("bookings")).isEqualTo(1);
                assertThat(count("booking_outbox")).isEqualTo(1);
                assertThat(count("booking_idempotency")).isEqualTo(1);
                assertThat(jdbc.queryForObject("""
                        SELECT count(*) FROM booking_history h JOIN bookings b ON b.id = h.booking_id WHERE b.partner_id = ?
                        """, Integer.class, partnerId)).isEqualTo(1);
                assertThat(jdbc.queryForObject("SELECT pet_id FROM bookings WHERE partner_id = ?", UUID.class, partnerId))
                        .isEqualTo(petId);
                assertThat(jdbc.queryForObject("SELECT request_key FROM booking_idempotency WHERE partner_id = ?",
                        String.class, partnerId)).isEqualTo("healthy");
            } finally {
                releaseResponse.countDown();
            }
        }
    }

    @Test
    void dependencyCallUsesRemainingTransactionBudget() {
        var transaction = new TransactionTemplate(transactions);
        transaction.setTimeout(1);
        long started = System.nanoTime();
        try {
            transaction.executeWithoutResult(status -> {
                try {
                    create(stalledPetId, "budget", date).andExpect(status().isServiceUnavailable());
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                } finally {
                    status.setRollbackOnly();
                }
            });
            assertThat(partialResponse.getCount()).isZero();
            assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
            assertThat(count("bookings")).isZero();
            assertThat(count("booking_outbox")).isZero();
            assertThat(count("booking_idempotency")).isZero();
        } finally {
            releaseResponse.countDown();
        }
    }

    @Test
    void databaseWaitHasItsOwnDeadlineAndReturnsRetryableError() throws Exception {
        var held = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var requests = Executors.newVirtualThreadPerTaskExecutor()) {
            try {
                var holder = requests.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
                    agenda.lockPartner(partnerId);
                    held.countDown();
                    try {
                        if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Trava de teste não liberada.");
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(e);
                    }
                }));
                assertThat(held.await(5, TimeUnit.SECONDS)).isTrue();
                long started = System.nanoTime();
                create(petId, "retryable", date).andExpect(status().isServiceUnavailable())
                        .andExpect(jsonPath("$.message").value("A agenda está ocupada. Tente novamente."));
                assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(6));
                assertThat(count("bookings")).isZero();
                assertThat(count("booking_outbox")).isZero();
                assertThat(count("booking_idempotency")).isZero();
                release.countDown();
                holder.get(5, TimeUnit.SECONDS);
                create(petId, "retryable", date).andExpect(status().isCreated());
            } finally {
                release.countDown();
            }
        }
    }

    @Test
    void projectedHoursDurationCapacityAndPartnerIdentityWorkOverHttp() throws Exception {
        http.perform(get("/bookings/availability").header("Authorization", auth("CUSTOMER"))
                        .param("partnerId", partnerId.toString()).param("serviceId", serviceId.toString())
                        .param("date", date.toLocalDate().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].time").value("10:00"))
                .andExpect(jsonPath("$[0].available").value(true));
        String stay = json.writeValueAsString(Map.of(
                "partnerId", partnerId, "petId", petId, "serviceId", boardingId, "type", "BOARDING", "price", 100,
                "checkIn", date.toString(), "checkOut", date.plusDays(2).toString()));
        http.perform(post("/bookings").header("Authorization", auth("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON).content(stay))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.price").value(100.0));
        http.perform(post("/bookings").header("Authorization", auth("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON).content(stay))
                .andExpect(status().isConflict());
        http.perform(post("/bookings").header("Authorization", auth("PARTNER"))
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "partnerId", partnerId, "petId", petId, "serviceId", serviceId, "type", "GROOMING",
                                "staffId", staffId, "receptionCustomerId", receptionId, "price", 60, "bookingDate", date.toString()))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.receptionCustomerId").value(receptionId.toString()))
                .andExpect(jsonPath("$.userId").isEmpty());
        assertThat(count("bookings")).isEqualTo(2);
        assertThat(count("booking_outbox")).isEqualTo(2);
    }

    @Test
    void directBookingReturns503WhenAuthAcceptsConnectionWithoutRespondingAnd401WhenItRejectsSession() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + bookingPort + "/api/v1/bookings/my-bookings"))
                    .header("Authorization", auth("CUSTOMER")).timeout(Duration.ofSeconds(6)).build();
            authStalled = true;
            long started = System.nanoTime();
            try {
                var unavailable = client.send(request, HttpResponse.BodyHandlers.ofString());
                assertThat(authRequestArrived.getCount()).isZero();
                assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(5));
                assertThat(unavailable.statusCode()).isEqualTo(503);
                assertThat(json.readTree(unavailable.body()).path("status").asInt()).isEqualTo(503);
                assertThat(unavailable.headers().firstValue("Cache-Control")).hasValue("no-store");
            } finally {
                authStalled = false;
                releaseAuth.countDown();
            }
            authStatus = 401;
            var rejected = client.send(request, HttpResponse.BodyHandlers.ofString());
            assertThat(rejected.statusCode()).isEqualTo(401);
            assertThat(json.readTree(rejected.body()).path("status").asInt()).isEqualTo(401);
            authStatus = 200;
            assertThat(client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(200);
        }
    }

    @Test
    void directBookingReturns503ForUncheckedHttpCancellation() throws Exception {
        // Force the direct cancellation variant independently of the JDK's completion ordering.
        var factory = new InterceptingClientHttpRequestFactory((uri, method) -> new MockClientHttpRequest(method, uri) {
            @Override
            protected ClientHttpResponse executeInternal() {
                throw new CancellationException("HTTP deadline");
            }
        }, restTemplate.getInterceptors());
        doReturn(factory).when(restTemplate).getRequestFactory();
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + bookingPort + "/api/v1/bookings/my-bookings"))
                    .header("Authorization", auth("CUSTOMER")).timeout(Duration.ofSeconds(6)).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(503);
            assertThat(json.readTree(response.body()).path("status").asInt()).isEqualTo(503);
        }
    }

    @Test
    void policyAndInactivePartnerPreserveExistingReservationAndReplay() throws Exception {
        var created = create(petId, "active-only", date).andExpect(status().isCreated()).andReturn();
        String id = json.readTree(created.getResponse().getContentAsString()).path("id").asText();
        String tutor = auth("CUSTOMER");
        http.perform(get("/bookings/policy").header("Authorization", tutor)).andExpect(status().isOk())
                .andExpect(jsonPath("$.tutorNoticeMinutes").value(90))
                .andExpect(jsonPath("$.defaultAppointmentDurationMinutes").value(30));
        http.perform(get("/bookings/" + id + "/tutor-actions").header("Authorization", tutor)).andExpect(status().isOk())
                .andExpect(jsonPath("$.canCancel").value(true)).andExpect(jsonPath("$.canReschedule").value(true));
        partnerActive = false;
        create(petId, "active-only", date).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        create(petId, "new", date.plusHours(1)).andExpect(status().isNotFound());
        http.perform(get("/bookings/" + id + "/tutor-actions").header("Authorization", tutor)).andExpect(status().isOk())
                .andExpect(jsonPath("$.canCancel").value(true)).andExpect(jsonPath("$.canReschedule").value(false));
        http.perform(post("/bookings/" + id + "/reschedule").header("Authorization", tutor)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("bookingDate", date.plusHours(1)))))
                .andExpect(status().isNotFound());
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/bookings/" + id + "/status")
                        .header("Authorization", tutor).param("status", "CANCELLED"))
                .andExpect(status().isOk());
        http.perform(get("/bookings/my-bookings").header("Authorization", tutor).param("status", "PENDING"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        http.perform(get("/bookings/my-bookings").header("Authorization", tutor).param("status", "CANCELLED"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(id));
        assertThat(count("bookings")).isEqualTo(1);
    }

    @Test
    void priceConflictDoesNotConsumeSlotOrIdempotencyKey() throws Exception {
        String input = json.writeValueAsString(Map.of("partnerId", partnerId, "petId", petId,
                "serviceId", serviceId, "type", "GROOMING", "staffId", staffId, "price", 59,
                "bookingDate", date.toString()));
        http.perform(post("/bookings").header("Authorization", auth("CUSTOMER"))
                        .header("Idempotency-Key", "price-update").contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errors.price").isNotEmpty());
        assertThat(count("bookings")).isZero();
        assertThat(count("booking_outbox")).isZero();
        assertThat(count("booking_idempotency")).isZero();
        create(petId, "price-update", date).andExpect(status().isCreated()).andExpect(jsonPath("$.price").value(60));
    }

    @Test
    void administrativeWriteChecksPartnerAndTransitionAndChecklistRejectsNewAuthorization() throws Exception {
        String id = json.readTree(create(petId, "admin", date).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).path("id").asText();
        var patch = org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .patch("/bookings/partner/" + partnerId + "/" + id + "/status");
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/bookings/partner/" + otherPartner + "/" + id + "/status")
                        .header("Authorization", auth("ADMIN")).param("status", "CONFIRMED"))
                .andExpect(status().isNotFound());
        http.perform(patch.header("Authorization", auth("CUSTOMER")).param("status", "CONFIRMED"))
                .andExpect(status().isForbidden());
        String admin = auth("ADMIN");
        String decision = "/" + id + "/fitting-decision";
        http.perform(post("/bookings/partner/" + otherPartner + decision)
                        .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isNotFound());
        http.perform(post("/bookings/partner/" + partnerId + decision)
                        .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isBadRequest());
        for (String state : java.util.List.of("COMPLETED", "CONFIRMED", "IN_PROGRESS", "CANCELLED")) {
            var result = http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                    .patch("/bookings/partner/" + partnerId + "/" + id + "/status")
                    .header("Authorization", admin).param("status", state));
            result.andExpect(state.equals("COMPLETED") || state.equals("CANCELLED") ? status().isBadRequest() : status().isOk());
        }
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/bookings/" + id + "/check-in")
                        .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"petIdentified\":true,\"instructionsConfirmed\":true,\"authorizedExtras\":\"Adicional\"}"))
                .andExpect(status().isBadRequest());
        http.perform(get("/bookings/" + id + "/tutor-actions").header("Authorization", auth("CUSTOMER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.canCancel").value(false))
                .andExpect(jsonPath("$.canReschedule").value(false));
    }

    @Test
    void authMustReturnExactly200AndRevokedTokenCannotReplay() throws Exception {
        create(petId, "revocable", date).andExpect(status().isCreated());
        authStatus = 401;
        create(petId, "revocable", date).andExpect(status().isUnauthorized());
        authStatus = 202;
        create(petId, "revocable", date).andExpect(status().isServiceUnavailable());
        authStatus = 204;
        create(petId, "revocable", date).andExpect(status().isServiceUnavailable());
        authStatus = 503;
        create(petId, "revocable", date).andExpect(status().isServiceUnavailable());
        authStatus = 200;
        create(petId, "revocable", date).andExpect(status().isCreated());
        assertThat(count("bookings")).isEqualTo(1);
        assertThat(count("booking_outbox")).isEqualTo(1);
        assertThat(count("booking_idempotency")).isEqualTo(1);
    }

    @Test
    void receptionistCanReserveAndProfessionalOnlyAttendsVerifiedAssignments() throws Exception {
        String input = json.writeValueAsString(Map.of("partnerId", partnerId, "petId", petId,
                "serviceId", serviceId, "type", "GROOMING", "staffId", staffId, "receptionCustomerId", receptionId,
                "price", 60, "bookingDate", date.toString()));
        String ownBooking = json.readTree(http.perform(post("/bookings").header("Authorization", auth("RECEPTION"))
                        .header("Idempotency-Key", "reception-intent").contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.userId").isEmpty())
                .andReturn().getResponse().getContentAsString()).path("id").asText();
        http.perform(post("/bookings").header("Authorization", auth("PROFESSIONAL"))
                        .contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isForbidden());
        http.perform(post("/bookings").header("Authorization", auth("RECEPTION"))
                        .contentType(MediaType.APPLICATION_JSON).content(input.replace(partnerId.toString(), otherPartner.toString())))
                .andExpect(status().isNotFound());
        UUID anotherBooking = UUID.randomUUID();
        UUID tutorBooking = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO bookings (id, pet_id, partner_id, user_id, booking_date, type, status, price, service_id, staff_id)
                VALUES (?, ?, ?, ?, ?, 'GROOMING', 'CONFIRMED', 10, ?, ?)
                """, anotherBooking, petId, partnerId, tutorId, date, serviceId, otherStaff);
        jdbc.update("""
                INSERT INTO bookings (id, pet_id, partner_id, user_id, booking_date, type, status, price, service_id, staff_id)
                VALUES (?, ?, ?, ?, ?, 'GROOMING', 'CONFIRMED', 10, ?, ?)
                """, tutorBooking, petId, partnerId, tutorId, date.plusDays(1), serviceId, staffId);

        var patch = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/bookings/" + ownBooking + "/status")
                .header("Authorization", auth("RECEPTION")).param("status", "CONFIRMED");
        http.perform(patch).andExpect(status().isOk());
        String professional = auth("PROFESSIONAL");
        http.perform(get("/bookings/agenda-access").header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.staffId").value(staffId.toString()));
        http.perform(get("/bookings/partner/" + partnerId).header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[1].id").value(ownBooking));
        http.perform(get("/bookings/partner/" + partnerId).header("Authorization", professional)
                        .param("staffId", otherStaff.toString()))
                .andExpect(status().isNotFound());
        http.perform(get("/bookings/partner/" + otherPartner).header("Authorization", professional))
                .andExpect(status().isNotFound());
        http.perform(get("/bookings/" + anotherBooking).header("Authorization", professional))
                .andExpect(status().isNotFound());
        http.perform(get("/bookings/" + anotherBooking + "/pet-summary").header("Authorization", professional))
                .andExpect(status().isNotFound());
        http.perform(get("/bookings/" + ownBooking + "/pet-summary").header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Luna de balcão"));
        http.perform(get("/bookings/" + tutorBooking + "/pet-summary").header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Luna de tutor"));
        http.perform(get("/bookings/partner/" + partnerId + "/summary").header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.services[0].name").value("Banho"));
        http.perform(post("/bookings/" + anotherBooking + "/ready").header("Authorization", professional))
                .andExpect(status().isNotFound());
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/bookings/" + ownBooking + "/status")
                        .header("Authorization", professional).param("status", "CANCELLED"))
                .andExpect(status().isForbidden());
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/bookings/" + ownBooking + "/status")
                        .header("Authorization", professional).param("status", "IN_PROGRESS"))
                .andExpect(status().isOk());
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/bookings/" + ownBooking + "/check-in")
                        .header("Authorization", professional).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"petIdentified\":true,\"instructionsConfirmed\":true}"))
                .andExpect(status().isOk());
        http.perform(post("/bookings/" + ownBooking + "/ready").header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.readyAt").isNotEmpty());
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/bookings/" + tutorBooking + "/status")
                        .header("Authorization", professional).param("status", "IN_PROGRESS"))
                .andExpect(status().isOk());
        http.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/bookings/" + tutorBooking + "/check-in")
                        .header("Authorization", professional).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"petIdentified\":true,\"instructionsConfirmed\":true}"))
                .andExpect(status().isOk());
        http.perform(post("/bookings/" + tutorBooking + "/ready").header("Authorization", professional))
                .andExpect(status().isOk()).andExpect(jsonPath("$.readyAt").isNotEmpty());
        http.perform(post("/bookings/" + tutorBooking + "/ready").header("Authorization", professional))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForList("SELECT event_type FROM booking_outbox WHERE booking_id = ?", String.class, tutorBooking))
                .containsExactly("BOOKING_READY");
        assertThat(jdbc.queryForList("SELECT actor_id FROM booking_history WHERE booking_id = ? ORDER BY id",
                UUID.class, UUID.fromString(ownBooking))).containsExactly(receptionistId, receptionistId, professionalId, professionalId);

        http.perform(get("/bookings/" + ownBooking).header("Authorization", auth("CUSTOMER"))).andExpect(status().isNotFound());
        claimLinked = true;
        http.perform(get("/bookings/" + ownBooking).header("Authorization", auth("CUSTOMER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userId").isEmpty());
        http.perform(get("/bookings/my-bookings").header("Authorization", auth("CUSTOMER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(3));
        http.perform(post("/bookings/" + ownBooking + "/interrupt").header("Authorization", professional)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Pedido do tutor de balcão\"}"))
                .andExpect(status().isOk());
        var deskEvents = agenda.pendingEvents(100).stream()
                .filter(event -> event.bookingId().equals(UUID.fromString(ownBooking))).toList();
        assertThat(deskEvents).extracting(event -> event.eventType())
                .containsExactly("BOOKING_CREATED", "BOOKING_CONFIRMED", "BOOKING_READY", "BOOKING_INTERRUPTED");
        assertThat(deskEvents).allSatisfy(event -> {
            assertThat(event.userId()).isNull();
            assertThat(event.receptionCustomerId()).isEqualTo(receptionId);
        });
        authStatus = 401;
        http.perform(get("/bookings/" + ownBooking).header("Authorization", professional)).andExpect(status().isUnauthorized());
    }

    private ResultActions create(UUID pet, String key, LocalDateTime start) throws Exception {
        return http.perform(post("/bookings").header("Authorization", auth("CUSTOMER")).header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "partnerId", partnerId, "petId", pet, "serviceId", serviceId, "type", "GROOMING",
                        "staffId", staffId, "price", 60, "bookingDate", start.toString()))));
    }

    private int pendingAgendaWaits() {
        return jdbc.queryForObject("""
                SELECT count(*) FROM pg_stat_activity
                WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%booking_agenda_locks%'
                """, Integer.class);
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE partner_id = ?", Integer.class, partnerId);
    }

    private String auth(String role) {
        return "Bearer " + Jwts.builder().subject("fixture@example.test")
                .claim("role", role).claim("userId", user(role).toString())
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }

    private UUID user(String role) {
        return switch (role) {
            case "RECEPTION" -> receptionistId;
            case "PROFESSIONAL" -> professionalId;
            case "OTHER_TUTOR" -> otherTutorId;
            default -> tutorId;
        };
    }

    private void serve(HttpExchange exchange) {
        try (exchange) {
            var path = exchange.getRequestURI().getPath();
            String authorization = exchange.getRequestHeaders().getFirst("Authorization");
            if (path.equals("/api/v1/internal/pets/" + petId + "/booking-summary")) {
                String query = exchange.getRequestURI().getRawQuery();
                String desk = "receptionCustomerId=" + receptionId + "&partnerId=" + partnerId;
                if (!"Bearer pet-summary-test-only".equals(authorization) || !("ownerId=" + tutorId).equals(query) && !desk.equals(query)) {
                    exchange.sendResponseHeaders(401, -1);
                    return;
                }
                byte[] bytes = json.writeValueAsBytes(Map.of("id", petId, "name",
                        desk.equals(query) ? "Luna de balcão" : "Luna de tutor", "species", "DOG"));
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                exchange.getResponseBody().write(bytes);
                return;
            }
            String role = java.util.stream.Stream.of("CUSTOMER", "OTHER_TUTOR", "PARTNER", "RECEPTION", "PROFESSIONAL", "ADMIN")
                    .filter(candidate -> auth(candidate).equals(authorization)).findFirst().orElse(null);
            if (role == null) {
                exchange.sendResponseHeaders(401, -1);
                return;
            }
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            if (path.equals("/api/v1/auth/session")) {
                if (authStalled) {
                    authRequestArrived.countDown();
                    releaseAuth.await(10, TimeUnit.SECONDS);
                    return;
                }
                if (authStatus >= 400 || authStatus == 204) {
                    exchange.sendResponseHeaders(authStatus, -1);
                    return;
                }
                var permissions = switch (role) {
                    case "RECEPTION" -> java.util.List.of("BOOKINGS_READ", "BOOKINGS_WRITE", "DESK_CUSTOMERS_MANAGE");
                    case "PROFESSIONAL" -> java.util.List.of("BOOKINGS_ASSIGNED_READ", "BOOKINGS_ASSIGNED_ATTEND");
                    default -> java.util.List.of();
                };
                byte[] bytes = json.writeValueAsBytes(permissions.isEmpty()
                        ? Map.of("role", role.equals("OTHER_TUTOR") ? "CUSTOMER" : role, "userId", user(role), "permissions", permissions)
                        : Map.of("role", "TEAM_MEMBER", "userId", user(role), "permissions", permissions,
                                 "accessRole", role, "partnerId", partnerId, "teamAccessId", user(role)));
                exchange.sendResponseHeaders(authStatus, bytes.length);
                exchange.getResponseBody().write(bytes);
                return;
            }
            if (path.equals("/api/v1/pets/" + stalledPetId)) {
                exchange.sendResponseHeaders(200, 0);
                exchange.getResponseBody().write("{\"ownerId\":\"".getBytes(StandardCharsets.UTF_8));
                exchange.getResponseBody().flush();
                partialResponse.countDown();
                releaseResponse.await(10, TimeUnit.SECONDS);
                return;
            }
            String body = response(path, role);
            if (body == null) {
                exchange.sendResponseHeaders(404, -1);
                return;
            }
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private String response(String path, String role) {
        if (path.equals("/api/v1/internal/partners/customer-claims/me") && role.equals("CUSTOMER")) {
            return claimLinked ? "[{\"customerId\":\"%s\",\"partnerId\":\"%s\"}]".formatted(receptionId, partnerId) : "[]";
        }
        if (path.equals("/api/v1/internal/partners/me/staff-assignment") && role.equals("PROFESSIONAL")) {
            return "{\"partnerId\":\"%s\",\"userId\":\"%s\",\"staffId\":\"%s\"}".formatted(partnerId, professionalId, staffId);
        }
        if (path.equals("/api/v1/partners/me/desk") && (role.equals("PARTNER") || role.equals("RECEPTION"))) {
            return "{\"partnerId\":\"%s\"}".formatted(partnerId);
        }
        if (path.equals("/api/v1/pets/" + petId)) {
            return "{\"ownerId\":\"%s\",\"active\":true}".formatted(tutorId);
        }
        if (path.equals("/api/v1/pets/reception/customers/" + receptionId + "/" + petId)) {
            return "{\"id\":\"%s\",\"customerId\":\"%s\",\"partnerId\":\"%s\"}".formatted(petId, receptionId, partnerId);
        }
        if (path.equals("/api/v1/partners/me")) {
            return "{\"id\":\"%s\"}".formatted(partnerId);
        }
        if (path.equals("/api/v1/internal/partners/" + partnerId + "/operations")) {
            return """
                    {"id":"%s","name":"Pet local","boardingCapacity":1,"active":%s,
                     "businessHours":[{"dayOfWeek":"%s","businessStartHour":"10:00","businessEndHour":"18:00","closed":false}],
                     "services":[{"id":"%s","name":"Banho","price":60.00,"durationMinutes":45,"billingUnit":"HOURLY"},
                                 {"id":"%s","name":"Hospedagem","price":50.00,"billingUnit":"DAILY"}]}
                    """.formatted(partnerId, partnerActive, date.getDayOfWeek(), serviceId, boardingId);
        }
        if (path.equals("/api/v1/internal/partners/" + partnerId + "/staff")) {
            return """
                    [{"id":"%s","partnerId":"%s","name":"Ana","status":"ACTIVE","serviceIds":["%s"]}]
                    """.formatted(staffId, partnerId, serviceId);
        }
        if (path.equals("/api/v1/internal/partners/staff/" + staffId + "/schedule")) {
            return """
                    [{"id":"%s","staffId":"%s","dayOfWeek":%d,"startTime":"08:00","endTime":"18:00"}]
                    """.formatted(UUID.randomUUID(), staffId, date.getDayOfWeek().getValue() % 7 + 1);
        }
        if (path.equals("/api/v1/internal/partners/staff/" + staffId + "/absences")) return "[]";
        return null;
    }
}
