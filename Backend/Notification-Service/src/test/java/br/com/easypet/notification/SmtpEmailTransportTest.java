package br.com.easypet.notification;

import static br.com.easypet.notification.Delivery.Outcome.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import java.util.Map;
import java.util.UUID;

import jakarta.mail.MessagingException;
import jakarta.mail.SendFailedException;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SmtpEmailTransportTest {
    private final JavaMailSender mail = mock(JavaMailSender.class);
    private final AuthClient auth = mock(AuthClient.class);
    private final EmailMessage input = new EmailMessage(UUID.randomUUID(), UUID.randomUUID(), "Agendamento", "Confirmação");
    private final MimeMessage message = new MimeMessage((Session) null);
    private SmtpEmailTransport transport;

    @BeforeEach
    void setup() throws Exception {
        when(auth.recipientEmail(input.userId())).thenReturn("tutor@example.test");
        when(mail.createMimeMessage()).thenReturn(message);
        transport = new SmtpEmailTransport(mail, auth, "sender@example.test", "example.test", "local-recipient-test-token");
    }

    @ParameterizedTest
    @ValueSource(strings = {"tutor@example.com", "tutor@sub.example.test", "tutor@another.test"})
    void homologDomainBlocksOtherRecipientsBeforeSmtp(String recipient) {
        when(auth.recipientEmail(input.userId())).thenReturn(recipient);
        assertThat(transport.send(input)).isEqualTo(new EmailTransport.Result(PERMANENT_FAILURE,
                "RECIPIENT_DOMAIN_BLOCKED"));
        verifyNoInteractions(mail);
    }

    @Test
    void invalidSenderOrPublicDomainFailsAtStartup() {
        org.assertj.core.api.Assertions.assertThatIllegalArgumentException().isThrownBy(() ->
                new SmtpEmailTransport(mail, auth, "sender@example.com", "example.com", "test-token"));
        org.assertj.core.api.Assertions.assertThatIllegalArgumentException().isThrownBy(() ->
                new SmtpEmailTransport(mail, auth, "sender@other.test", "example.test", "test-token"));
    }

    @Test
    void smtpAcceptsARecipientResolvedAtSendTimeAndUsesStableMessageId() throws Exception {
        assertThat(transport.send(input).outcome()).isEqualTo(SENT);
        assertThat(message.getAllRecipients()).hasSize(1);
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("tutor@example.test");
        assertThat(message.getHeader("Message-ID", null)).isEqualTo("<" + input.deliveryId() + "@example.test>");
    }

    @Test
    void confirmedTemporaryRejectionAllowsAutomaticRetry() {
        var rejection = new SMTPSendFailedException("DATA", 451, "temporarily unavailable", null, null, null, null);
        doThrow(new MailSendException(Map.of(message, rejection))).when(mail).send(message);

        assertThat(transport.send(input)).isEqualTo(new EmailTransport.Result(TRANSIENT_FAILURE, "SMTP_TEMPORARY"));
    }

    @ParameterizedTest
    @ValueSource(ints = {451, 550})
    void wrappedRecipientRejectionHasKnownOutcome(int code) throws Exception {
        var address = new InternetAddress("tutor@example.test");
        var recipientError = new SMTPAddressFailedException(address, "RCPT TO", code, "recipient rejected");
        var wrapper = new SendFailedException("Invalid Addresses", recipientError, null, null, null);
        doThrow(new MailSendException(Map.of(message, wrapper))).when(mail).send(message);

        assertThat(transport.send(input)).isEqualTo(code == 451
                ? new EmailTransport.Result(TRANSIENT_FAILURE, "SMTP_TEMPORARY")
                : new EmailTransport.Result(PERMANENT_FAILURE, "SMTP_REJECTED"));
    }

    @Test
    void transportDisconnectAfterPossibleAcceptanceIsUncertain() {
        doThrow(new MailSendException("socket closed", new MessagingException())).when(mail).send(any(MimeMessage.class));

        assertThat(transport.send(input)).isEqualTo(new EmailTransport.Result(UNKNOWN, "SMTP_UNCERTAIN"));
    }

    @Test
    void readyMessageUsesDedicatedAuthLookupAndFreshAddress() throws Exception {
        var upstream = recipientServer();
        upstream.server().expect(requestTo(upstream.url() + "/internal/notification-recipients/" + input.userId()))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer local-recipient-test-token"))
                .andRespond(withSuccess("{\"email\":\"ready-tutor@example.test\"}", MediaType.APPLICATION_JSON));

        var ready = new Delivery(input.deliveryId(), UUID.randomUUID(), Delivery.Type.READY, Delivery.Status.SENDING,
                java.time.LocalDateTime.of(2026, 11, 13, 15, 0), null, null, null, 1, 1, null);
        assertThat(upstream.transport().send(EmailMessage.forDelivery(ready, input.userId())).outcome())
                .isEqualTo(SENT);
        assertThat(message.getSubject()).isEqualTo("Serviço pronto para retirada");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("ready-tutor@example.test");
        upstream.server().verify();
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 404, 503})
    void failedRecipientLookupNeverCallsSmtp(int status) throws Exception {
        var upstream = recipientServer();
        upstream.server().expect(requestTo(upstream.url() + "/internal/notification-recipients/" + input.userId()))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer local-recipient-test-token"))
                .andRespond(withStatus(HttpStatus.valueOf(status)));

        assertThat(upstream.transport().send(input)).isEqualTo(status == 404
                ? new EmailTransport.Result(PERMANENT_FAILURE, "RECIPIENT_UNAVAILABLE")
                : new EmailTransport.Result(TRANSIENT_FAILURE, "RECIPIENT_LOOKUP_UNAVAILABLE"));
        verifyNoInteractions(mail);
        upstream.server().verify();
    }

    private RecipientServer recipientServer() throws Exception {
        String url = "http://auth.test/api/v1";
        String token = "local-recipient-test-token";
        var builder = RestClient.builder().baseUrl(url);
        var server = MockRestServiceServer.bindTo(builder).build();
        InternalHttp http = mock(InternalHttp.class);
        when(http.client(url)).thenReturn(builder);
        return new RecipientServer(url, server,
                new SmtpEmailTransport(mail, new AuthClient(http, url, token), "sender@example.test", "example.test", token));
    }

    private record RecipientServer(String url, MockRestServiceServer server, SmtpEmailTransport transport) {}
}
