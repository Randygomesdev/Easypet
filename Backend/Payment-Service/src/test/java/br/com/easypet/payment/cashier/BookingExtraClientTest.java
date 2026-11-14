package br.com.easypet.payment.cashier;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class BookingExtraClientTest {
    @Test
    void checksVersionedSnapshotAndDoesNotCoerceFractionalCents() {
        UUID approval = UUID.randomUUID();
        UUID partner = UUID.randomUUID();
        UUID booking = UUID.randomUUID();
        UUID tutor = UUID.randomUUID();
        String url = "http://booking.example.test/api/v1";
        var builder = new RestTemplateBuilder().additionalCustomizers(template ->
                MockRestServiceServer.bindTo(template).build().expect(requestTo(
                        url + "/internal/booking-extra-authorizations/" + approval
                                + "?partnerId=" + partner + "&bookingId=" + booking + "&version=1"))
                        .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-credential"))
                        .andRespond(withSuccess("""
                                {"authorizationId":"%s","partnerId":"%s","bookingId":"%s","version":1,
                                 "description":"Hidratação","quantity":2,"unitPriceCents":750,"amountCents":1500.01,
                                 "currency":"BRL","approvedAt":"2026-11-14T12:00:00Z","approvedBy":"%s","tutorId":"%s",
                                 "tutorIdentityType":"AUTH_USER","channel":"DIGITAL"}
                                """.formatted(approval, partner, booking, tutor, tutor), MediaType.APPLICATION_JSON)));
        var client = new BookingExtraClient(builder, new ObjectMapper().findAndRegisterModules(), url, "test-credential");

        assertThatExceptionOfType(CashierException.class)
                .isThrownBy(() -> client.approved(partner, booking, new CashierModels.ApplyExtra(approval, BigDecimal.ONE)))
                .satisfies(error -> assertThat(error.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }
}
