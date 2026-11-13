package br.com.easypet.notification;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestClient;

class NotificationAuthorizationTest {
    private static final String AUTH_URL = "http://auth.test/api/v1";
    private final UUID id = UUID.randomUUID();
    private final UUID actor = UUID.randomUUID();
    private final UUID key = UUID.randomUUID();
    private final NotificationAdmin admin = mock(NotificationAdmin.class);
    private MockRestServiceServer server;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        var builder = RestClient.builder().baseUrl(AUTH_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        InternalHttp http = mock(InternalHttp.class);
        when(http.client(AUTH_URL)).thenReturn(builder);
        mvc = MockMvcBuilders.standaloneSetup(new NotificationController(new AuthClient(http, AUTH_URL, ""), admin))
                .setControllerAdvice(new NotificationErrors()).build();
    }

    @Test
    void spoofedHeadersCannotAuthorizeRetry() throws Exception {
        mvc.perform(post("/admin/notifications/{id}/retry", id).header("Idempotency-Key", key)
                        .header("X-User-Id", actor).header("X-User-Role", "ADMIN"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(admin);
    }

    @Test
    void customerTokenCannotAuthorizeRetry() throws Exception {
        session("CUSTOMER");
        mvc.perform(post("/admin/notifications/{id}/retry", id).header("Idempotency-Key", key)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer session-token"))
                .andExpect(status().isForbidden());
        server.verify();
        verifyNoInteractions(admin);
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 503})
    void allOperationsRevalidatePreviouslyAcceptedAdminSessions(int denial) throws Exception {
        session("ADMIN");
        session("ADMIN");
        session("ADMIN");
        when(admin.list(id, 0, 20)).thenReturn(new NotificationAdmin.Page(List.of(), 0, 20, 0, 0));
        when(admin.attempts(id)).thenReturn(List.of());
        mvc.perform(get("/admin/notifications").param("bookingId", id.toString())
                .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")).andExpect(status().isOk());
        mvc.perform(get("/admin/notifications/{id}/attempts", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")).andExpect(status().isOk());
        mvc.perform(post("/admin/notifications/{id}/retry", id).header("Idempotency-Key", key)
                .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")).andExpect(status().isAccepted());
        server.verify();
        clearInvocations(admin);
        server.reset();

        server.expect(org.springframework.test.web.client.ExpectedCount.times(3),
                requestTo(AUTH_URL + "/auth/session")).andRespond(withStatus(HttpStatus.valueOf(denial)));
        mvc.perform(get("/admin/notifications").param("bookingId", id.toString())
                .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")).andExpect(status().is(denial));
        mvc.perform(get("/admin/notifications/{id}/attempts", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")).andExpect(status().is(denial));
        mvc.perform(post("/admin/notifications/{id}/retry", id).header("Idempotency-Key", key)
                .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")).andExpect(status().is(denial));
        server.verify();
        verifyNoInteractions(admin);
    }

    @Test
    void verifiedAdminRetriesWithVerifiedActorAndKey() throws Exception {
        session("ADMIN");
        mvc.perform(post("/admin/notifications/{id}/retry", id).header("Idempotency-Key", key)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer session-token")
                        .header("X-User-Id", UUID.randomUUID()))
                .andExpect(status().isAccepted())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
        server.verify();
        verify(admin).retry(id, key, actor);
    }

    private void session(String role) {
        server.expect(requestTo(AUTH_URL + "/auth/session"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer session-token"))
                .andRespond(withSuccess("""
                        {"userId":"%s","role":"%s","permissions":[]}
                        """.formatted(actor, role), MediaType.APPLICATION_JSON));
    }
}
