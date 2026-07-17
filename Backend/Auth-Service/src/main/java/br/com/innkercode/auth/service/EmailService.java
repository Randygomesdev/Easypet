package br.com.innkercode.auth.service;

import br.com.innkercode.auth.exception.EmailException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${MAIL_USERNAME}")
    private String mailFrom;

    public void sendPasswordResetEmail(String to, String name, String token) {
        try {
            String resetUrl = "http://localhost:4200/reset-password?token=" + token;

            Context context = new Context();
            context.setVariable("name", name);
            context.setVariable("resetUrl", resetUrl);

            String htmlContent = templateEngine.process("password-reset", context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true,  "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject("Easypet - Recuperação de Senha");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("E-mail HTML de recuperação enviado para: {}", to);
        } catch (MessagingException e) {
            log.error("Falha ao enviar e-mail HTML para: {}", to, e);
            throw new EmailException("Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.", e);
        }


    }
}
