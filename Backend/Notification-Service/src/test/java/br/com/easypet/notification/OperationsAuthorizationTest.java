package br.com.easypet.notification;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class OperationsAuthorizationTest {
    private final AuthClient auth = mock(AuthClient.class);
    private final OperationsInbox inbox = mock(OperationsInbox.class);
    private final NotificationPreferences preferences = mock(NotificationPreferences.class);
    private final String operationsToken = "local-operations-test";
    private final org.springframework.test.web.servlet.MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new OperationsController(auth, inbox, operationsToken), new NotificationPreferenceController(auth, preferences))
            .setControllerAdvice(new NotificationErrors()).build();

    @Test
    void ingressUsesDedicatedCredentialAndRejectsForgedIdentity() throws Exception {
        var id = UUID.randomUUID();
        String input = """
                {"incidentId":"%s","sequence":1,"state":"OPEN","source":"INFRA","service":"BOOKING",
                 "code":"SERVICE_UNAVAILABLE","severity":"ERROR"}
                """.formatted(id);
        mvc.perform(post("/internal/operations/alerts").header("X-User-Role", "ADMIN")
                .contentType(MediaType.APPLICATION_JSON).content(input)).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/operations/alerts").header("Authorization", "Bearer user-token")
                .contentType(MediaType.APPLICATION_JSON).content(input)).andExpect(status().isUnauthorized());
        verifyNoInteractions(auth, inbox);
        mvc.perform(post("/internal/operations/alerts").header("Authorization", "Bearer " + operationsToken)
                .contentType(MediaType.APPLICATION_JSON).content(input)).andExpect(status().isAccepted());
        verify(inbox).ingest(new OperationsItem.AlertRequest(id, 1, OperationsItem.SignalState.OPEN,
                OperationsItem.Source.INFRA, OperationsItem.Service.BOOKING, "SERVICE_UNAVAILABLE",
                OperationsItem.Severity.ERROR, null));
    }

    @Test
    void administrationFailsClosedAndPreferenceUsesSessionActor() throws Exception {
        when(auth.requireAdmin("Bearer customer")).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        mvc.perform(get("/admin/operations/inbox/unread").header("Authorization", "Bearer customer")
                .header("X-User-Role", "ADMIN")).andExpect(status().isForbidden());
        verifyNoInteractions(inbox);

        var actor = UUID.randomUUID();
        when(auth.requireRole("Bearer customer", "CUSTOMER")).thenReturn(actor);
        mvc.perform(put("/notifications/preferences").header("Authorization", "Bearer customer")
                .header("X-User-Id", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookingEmail\":false}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingEmail").value(false));
        verify(preferences).change(actor, false);
    }
}
