package br.com.innkercode.auth.config;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class HomologAuthConfiguration {

    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "[::1]");
    private final Environment environment;

    public boolean isHomolog() {
        return environment.acceptsProfiles(Profiles.of("homolog"));
    }

    public boolean canSendTo(String email) {
        return !isHomolog() || isFixtureAddress(email);
    }

    public static boolean isFixtureAddress(String email) {
        return email != null && email.toLowerCase(Locale.ROOT).endsWith("@example.test");
    }

    @PostConstruct
    void validate() {
        validateDistinctSecrets();
        if (isHomolog() && enabled("app.s02-enabled")) {
            String teamKey = required("AUTH_TEAM_JWT_SECRET");
            check(teamKey.getBytes(StandardCharsets.UTF_8).length >= 32, "AUTH_TEAM_JWT_SECRET");
            URI partner = httpUrl("PARTNER_SERVICE_URL");
            check("/api/v1".equals(partner.getPath()) || "/api/v1/".equals(partner.getPath()), "PARTNER_SERVICE_URL");
        }
        if (enabled("app.mail.enabled")) {
            validateMail();
        }
    }

    private void validateMail() {
        URI frontend = httpUrl("FRONTEND_URL");
        check(frontend.toString().equals(environment.getProperty("app.frontend-url", frontend.toString())), "FRONTEND_URL");
        check(frontend.getPath().isEmpty() || "/".equals(frontend.getPath()), "FRONTEND_URL");
        String host = required("MAIL_HOST");
        check(host.equals(environment.getProperty("spring.mail.host", host)), "MAIL_HOST");
        String from = required("MAIL_FROM");
        check(isSingleMailbox(from), "MAIL_FROM");
        int port;
        try {
            port = Integer.parseInt(required("MAIL_PORT"));
        } catch (NumberFormatException ex) {
            throw invalid("MAIL_PORT");
        }
        check(port >= 1 && port <= 65535 && port == environment.getProperty("spring.mail.port", Integer.class, port),
                "MAIL_PORT");

        if (isHomolog()) {
            check("https".equals(frontend.getScheme()) || LOOPBACK.contains(frontend.getHost()), "FRONTEND_URL");
            check("smtp-capture".equals(host) || LOOPBACK.contains(host), "MAIL_HOST");
            check(isFixtureAddress(from), "MAIL_FROM");
            check(from.equals(environment.getProperty("app.mail.from", from)), "MAIL_FROM");
            check(!environment.containsProperty("spring.mail.jndi-name"), "SPRING_MAIL_JNDI_NAME");
        }
        if (environment.getProperty("spring.mail.properties.mail.smtp.auth", Boolean.class, true)) {
            required("MAIL_USERNAME");
            required("MAIL_PASSWORD");
        }
    }

    private void validateDistinctSecrets() {
        var seen = new HashSet<String>();
        for (String name : new String[] {"JWT_SECRET", "AUTH_TEAM_JWT_SECRET",
                "NOTIFICATION_RECIPIENT_TOKEN", "RECEPTION_CLAIM_TOKEN"}) {
            String value = environment.getProperty(name, "");
            if (!value.isBlank()) check(seen.add(value), name);
        }
    }

    private boolean enabled(String property) {
        return environment.getProperty(property, Boolean.class, false);
    }

    private String required(String name) {
        String value = environment.getProperty(name, "");
        check(!value.isBlank() && value.equals(value.strip()), name);
        return value;
    }

    private URI httpUrl(String name) {
        try {
            URI uri = URI.create(required(name));
            check(uri.getHost() != null && uri.getRawUserInfo() == null
                    && uri.getRawQuery() == null && uri.getRawFragment() == null
                    && ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())), name);
            return uri;
        } catch (IllegalArgumentException ex) {
            // Parser errors can include the source URL, so emit only the variable name.
            throw invalid(name);
        }
    }

    private boolean isSingleMailbox(String value) {
        try {
            InternetAddress address = new InternetAddress(value, true);
            address.validate();
            return value.equals(address.getAddress()) && !address.isGroup();
        } catch (AddressException ex) {
            return false;
        }
    }

    private static void check(boolean condition, String name) {
        if (!condition) throw invalid(name);
    }

    private static IllegalStateException invalid(String name) {
        return new IllegalStateException("Configuração do Auth ausente ou inválida: " + name);
    }
}
