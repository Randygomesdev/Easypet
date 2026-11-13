package br.com.innkercode.auth.service;

import br.com.innkercode.auth.config.HomologAuthConfiguration;
import br.com.innkercode.auth.exception.ApiException;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final HomologAuthConfiguration configuration;

    @Value("${app.mail.enabled}")
    private boolean enabled;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public record PasswordResetMail(String email, String name, String token) {}
    public record TeamInvitationMail(String email, String token) {}

    public void requireEnabled() {
        if (!enabled) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_UNAVAILABLE",
                    "O envio de e-mails está indisponível.");
        }
    }

    public boolean canSendTo(String email) {
        return configuration.canSendTo(email);
    }

    @Async("authMailExecutor")
    @TransactionalEventListener
    public void sendPasswordResetEmail(PasswordResetMail event) {
        Context context = new Context();
        context.setVariable("name", event.name());
        context.setVariable("resetUrl", link("/reset-password", event.token()));
        send(event.email(), "Easypet - Recuperação de Senha",
                templateEngine.process("password-reset", context), true);
    }

    @Async("authMailExecutor")
    @TransactionalEventListener
    public void sendTeamInvitationEmail(TeamInvitationMail event) {
        String body = "Você recebeu um convite para acessar a equipe de um estabelecimento no Easypet.\n"
                + "O convite expira em 48 horas. Para ativar sua conta, abra este link:\n"
                + link("/team/invitation", event.token());
        send(event.email(), "Easypet - Convite para equipe", body, false);
    }

    private String link(String path, String token) {
        String origin = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        return UriComponentsBuilder.fromUriString(origin).path(path)
                .queryParam("token", token).build().toUriString();
    }

    private void send(String to, String subject, String body, boolean html) {
        if (!enabled || !canSendTo(to)) {
            return;
        }
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, html);
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            log.warn("Falha no transporte de e-mail transacional ({})", ex.getClass().getSimpleName());
        }
    }
}
