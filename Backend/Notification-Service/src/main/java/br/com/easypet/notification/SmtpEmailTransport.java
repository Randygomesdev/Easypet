package br.com.easypet.notification;

import static br.com.easypet.notification.Delivery.Outcome.*;

import java.util.Locale;
import java.util.UUID;

import org.eclipse.angus.mail.util.MailConnectException;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.eclipse.angus.mail.smtp.SMTPSenderFailedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

import jakarta.mail.MessagingException;
import jakarta.mail.SendFailedException;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@Component
@ConditionalOnProperty(name = "notification.transport", havingValue = "SMTP")
class SmtpEmailTransport implements EmailTransport {
    private final JavaMailSender mail;
    private final AuthClient auth;
    private final InternetAddress from;
    private final String allowedDomain;

    SmtpEmailTransport(JavaMailSender mail, AuthClient auth,
            @Value("${notification.mail-from}") String from,
            @Value("${notification.mail-allowed-domain}") String allowedDomain,
            @Value("${notification.recipient-token}") String token) throws AddressException {
        if (token.isBlank()) {
            throw new IllegalArgumentException("SMTP requer configuração do serviço interno de destinatários");
        }
        this.mail = mail;
        this.auth = auth;
        this.allowedDomain = allowedDomain.toLowerCase(Locale.ROOT);
        if (!this.allowedDomain.matches("(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+test")) {
            throw new IllegalArgumentException("SMTP requer um domínio fictício sob .test");
        }
        this.from = address(from);
        if (!isAllowed(this.from)) {
            throw new IllegalArgumentException("Remetente SMTP fora do domínio de teste");
        }
    }

    @Override
    public Result send(EmailMessage email) {
        String recipient;
        try {
            recipient = auth.recipientEmail(email.userId());
        } catch (RestClientException exception) {
            return new Result(TRANSIENT_FAILURE, "RECIPIENT_LOOKUP_UNAVAILABLE");
        }
        if (recipient == null) {
            return new Result(PERMANENT_FAILURE, "RECIPIENT_UNAVAILABLE");
        }

        try {
            InternetAddress target = address(recipient);
            if (!isAllowed(target)) {
                return new Result(PERMANENT_FAILURE, "RECIPIENT_DOMAIN_BLOCKED");
            }
            MimeMessage message = mail.createMimeMessage();
            message.setFrom(from);
            message.setRecipient(MimeMessage.RecipientType.TO, target);
            message.setSubject(email.subject(), "UTF-8");
            message.setText(email.body(), "UTF-8");
            message.setHeader("Message-ID", messageId(email.deliveryId()));
            mail.send(message);
            return new Result(SENT, null);
        } catch (MailAuthenticationException exception) {
            return new Result(PERMANENT_FAILURE, "SMTP_AUTHENTICATION");
        } catch (MailSendException exception) {
            // A connection failure occurred before handoff. An empty failure map alone is ambiguous.
            if (exception.getCause() instanceof MailConnectException) {
                return new Result(TRANSIENT_FAILURE, "SMTP_TEMPORARY");
            }
            Exception[] failures = exception.getMessageExceptions();
            return failures.length == 1 ? classifyRejection(failures[0]) : new Result(UNKNOWN, "SMTP_UNCERTAIN");
        } catch (MailException exception) {
            return new Result(UNKNOWN, "SMTP_UNCERTAIN");
        } catch (MessagingException exception) {
            return new Result(PERMANENT_FAILURE, "EMAIL_INVALID");
        }
    }

    private static Result classifyRejection(Exception failure) {
        // Angus wraps RCPT rejection inside SendFailedException.
        for (Exception current = failure; current instanceof MessagingException mailError;
                current = mailError.getNextException()) {
            if (current instanceof SendFailedException sendError
                    && sendError.getValidSentAddresses() != null && sendError.getValidSentAddresses().length > 0) {
                break;
            }
            if (current instanceof SMTPSendFailedException smtp) {
                return rejected(smtp.getReturnCode());
            }
            if (current instanceof SMTPAddressFailedException smtp) {
                return rejected(smtp.getReturnCode());
            }
            if (current instanceof SMTPSenderFailedException smtp) {
                return rejected(smtp.getReturnCode());
            }
        }
        return new Result(UNKNOWN, "SMTP_UNCERTAIN");
    }

    private static Result rejected(int reply) {
        if (reply >= 400 && reply < 500) {
            return new Result(TRANSIENT_FAILURE, "SMTP_TEMPORARY");
        }
        if (reply >= 500 && reply < 600) {
            return new Result(PERMANENT_FAILURE, "SMTP_REJECTED");
        }
        return new Result(UNKNOWN, "SMTP_UNCERTAIN");
    }

    private static InternetAddress address(String value) throws AddressException {
        InternetAddress[] addresses = InternetAddress.parse(value, true);
        if (addresses.length != 1 || addresses[0].isGroup() || addresses[0].getPersonal() != null) {
            throw new AddressException("Endereço inválido");
        }
        addresses[0].validate();
        return addresses[0];
    }

    private String messageId(UUID deliveryId) {
        return "<" + deliveryId + "@" + allowedDomain + ">";
    }

    private boolean isAllowed(InternetAddress address) {
        String mailbox = address.getAddress();
        return mailbox.substring(mailbox.lastIndexOf('@') + 1).equalsIgnoreCase(allowedDomain);
    }
}
