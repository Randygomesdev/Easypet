package br.com.easypet.notification;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

class ReceptionRecipientClientTest {
    @Test
    void resolvesWithDedicatedTokenAndDoesNotCacheConsent() {
        String url = "http://partner.test/api/v1";
        UUID partner = UUID.randomUUID();
        UUID customer = UUID.randomUUID();
        UUID grant = UUID.randomUUID();
        var http = mock(InternalHttp.class);
        var builder = RestClient.builder().baseUrl(url);
        when(http.client(url)).thenReturn(builder);
        var server = MockRestServiceServer.bindTo(builder).build();
        var path = url + "/internal/partners/" + partner + "/reception-customers/" + customer + "/notification-recipient";
        String token = "reception-test-token";
        server.expect(requestTo(path)).andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andRespond(withSuccess("""
                        {"email":"tutor@example.test","authorizationId":"%s","grantedAt":"2026-11-14T14:00:00Z"}
                        """.formatted(grant), MediaType.APPLICATION_JSON));
        server.expect(requestTo(path)).andRespond(withResourceNotFound());
        server.expect(requestTo(path)).andRespond(withServiceUnavailable());
        var client = new ReceptionRecipientClient(http, url, token);

        assertThat(client.resolve(partner, customer)).isEqualTo(new ReceptionRecipientClient.Recipient(
                "tutor@example.test", grant, Instant.parse("2026-11-14T14:00:00Z")));
        assertThat(client.resolve(partner, customer)).isNull();
        assertThatThrownBy(() -> client.resolve(partner, customer)).isInstanceOf(RestClientException.class);
        server.verify();
    }
}
