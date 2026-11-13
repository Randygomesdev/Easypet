package br.com.innkercode.auth.config;

import br.com.innkercode.auth.service.AccountCredentials;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import org.springframework.core.env.Environment;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public record GoogleAuthSettings(URI origin, URI callback, Set<String> allowedEmails) {

    public static final String CALLBACK_PATH = "/api/v1/login/oauth2/code/google";
    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "[::1]");

    static GoogleAuthSettings load(Environment environment) {
        URI frontend = readUri(environment, "FRONTEND_URL");
        URI callback = readUri(environment, "GOOGLE_REDIRECT_URI");
        URI origin = URI.create(frontend.getScheme() + "://" + frontend.getRawAuthority());
        if (!(frontend.getPath().isEmpty() || "/".equals(frontend.getPath()))) {
            throw invalid("FRONTEND_URL");
        }
        if (!origin.resolve(CALLBACK_PATH).toString().equals(callback.toString())) {
            throw invalid("GOOGLE_REDIRECT_URI");
        }
        Set<String> allowed = Arrays.stream(environment.getProperty("app.google-auth.allowed-emails", "").split(","))
                .filter(email -> !email.isBlank())
                .map(AccountCredentials::normalizeEmail)
                .map(GoogleAuthSettings::validateEmail)
                .collect(Collectors.toUnmodifiableSet());
        if (allowed.isEmpty()) throw invalid("GOOGLE_ALLOWED_EMAILS");
        return new GoogleAuthSettings(origin, callback, allowed);
    }

    static String required(Environment environment, String key) {
        String value = environment.getProperty(key, "");
        if (value.isBlank() || !value.equals(value.strip())) throw invalid(key);
        return value;
    }

    private static URI readUri(Environment environment, String key) {
        URI uri;
        try {
            uri = URI.create(required(environment, key));
        } catch (IllegalArgumentException ex) {
            throw invalid(key);
        }
        if (uri.getHost() == null || uri.getRawUserInfo() != null || uri.getRawQuery() != null
                || uri.getRawFragment() != null || uri.getPort() == 0 || uri.getPort() > 65535
                || !uri.getHost().equals(uri.getHost().toLowerCase(java.util.Locale.ROOT))
                || ("https".equals(uri.getScheme()) && uri.getPort() == 443)
                || ("http".equals(uri.getScheme()) && uri.getPort() == 80)
                || !("https".equals(uri.getScheme())
                || ("http".equals(uri.getScheme()) && LOOPBACK.contains(uri.getHost())))) {
            throw invalid(key);
        }
        return uri;
    }

    private static String validateEmail(String email) {
        try {
            InternetAddress address = new InternetAddress(email, true);
            address.validate();
            if (email.length() <= 255 && email.equals(address.getAddress()) && !address.isGroup()) return email;
        } catch (AddressException ignored) {
            // Avoid exposing allowlist contents in startup diagnostics.
        }
        throw invalid("GOOGLE_ALLOWED_EMAILS");
    }

    private static IllegalStateException invalid(String key) {
        return new IllegalStateException("Configuração do login Google ausente ou inválida: " + key);
    }
}
