package br.com.innkercode.auth.security;

import br.com.innkercode.auth.config.GoogleAuthSettings;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.service.GoogleAccountService;
import br.com.innkercode.auth.service.GoogleAccountService.Grant;
import br.com.innkercode.auth.service.OneTimeTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionException;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.google-auth.enabled", havingValue = "true")
public class GoogleOAuthFlow {

    public static final String AUTHORIZATION = "/oauth2/authorization/google";
    public static final String CALLBACK = "/login/oauth2/code/google";
    private static final String PENDING = GoogleOAuthFlow.class.getName() + ".exchange";
    private static final String STATE_CONSUMED = GoogleOAuthFlow.class.getName() + ".stateConsumed";
    private static final Duration EXCHANGE_LIFETIME = Duration.ofMinutes(2);

    private final GoogleAuthSettings settings;
    private final GoogleAccountService accounts;
    private final Clock clock;

    public void success(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {
        HttpSession session = request.getSession(false);
        if (session == null || !(authentication instanceof OAuth2AuthenticationToken token)
                || !"google".equals(token.getAuthorizedClientRegistrationId())
                || !(token.getPrincipal() instanceof OidcUser principal)) {
            redirectFailure(request, response, false);
            return;
        }

        Grant grant;
        try {
            grant = accounts.authorize(principal);
        } catch (ApiException | DataAccessException | TransactionException ex) {
            redirectFailure(request, response, false);
            return;
        }
        String code = OneTimeTokens.generate();
        synchronized (session) {
            request.changeSessionId();
            session.setMaxInactiveInterval((int) EXCHANGE_LIFETIME.toSeconds());
            session.setAttribute(PENDING, new PendingExchange(OneTimeTokens.digest(code), grant,
                    clock.instant().plus(EXCHANGE_LIFETIME)));
        }
        response.sendRedirect(settings.origin().resolve("/login-success#code=" + code).toString());
    }

    public void failure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        boolean cancelled = exception instanceof OAuth2AuthenticationException failure
                && "access_denied".equals(failure.getError().getErrorCode());
        redirectFailure(request, response, cancelled);
    }

    public Grant consume(HttpServletRequest request, String code) {
        HttpSession session = request.getSession(false);
        if (session == null) throw ApiException.invalidSession();
        synchronized (session) {
            try {
                if (!(session.getAttribute(PENDING) instanceof PendingExchange pending)
                        || !pending.digest().equals(OneTimeTokens.digest(code))) {
                    throw ApiException.invalidSession();
                }
                session.invalidate();
                if (!clock.instant().isBefore(pending.expiresAt())) throw ApiException.invalidSession();
                return pending.grant();
            } catch (IllegalStateException ex) {
                // A concurrent request can already have consumed and invalidated this session.
                throw ApiException.invalidSession();
            }
        }
    }

    private void redirectFailure(HttpServletRequest request, HttpServletResponse response, boolean cancelled)
            throws IOException {
        HttpSession session = request.getSession(false);
        if (session != null && Boolean.TRUE.equals(request.getAttribute(STATE_CONSUMED))) {
            session.invalidate();
        }
        String error = cancelled ? "google_cancelled" : "google_failed";
        response.sendRedirect(settings.origin().resolve("/login?error=" + error).toString());
    }

    public AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequests(
            AuthorizationRequestRepository<OAuth2AuthorizationRequest> delegate) {
        return new AuthorizationRequestRepository<>() {
            @Override
            public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
                return delegate.loadAuthorizationRequest(request);
            }

            @Override
            public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorization, HttpServletRequest request,
                                                 HttpServletResponse response) {
                if (authorization != null && request.getSession(false) != null) {
                    request.getSession(false).invalidate();
                }
                delegate.saveAuthorizationRequest(authorization, request, response);
            }

            @Override
            public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
                                                                         HttpServletResponse response) {
                HttpSession session = request.getSession(false);
                if (session == null) return null;
                synchronized (session) {
                    OAuth2AuthorizationRequest result = delegate.removeAuthorizationRequest(request, response);
                    if (result != null) request.setAttribute(STATE_CONSUMED, true);
                    return result;
                }
            }
        };
    }

    // The application only needs verified ID token claims and never calls Google with the user's access token.
    public OAuth2AuthorizedClientRepository discardProviderTokens() {
        return new OAuth2AuthorizedClientRepository() {
            @Override
            public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String registration,
                    Authentication principal, HttpServletRequest request) {
                return null;
            }

            @Override
            public void saveAuthorizedClient(OAuth2AuthorizedClient client, Authentication principal,
                    HttpServletRequest request, HttpServletResponse response) {}

            @Override
            public void removeAuthorizedClient(String registration, Authentication principal,
                    HttpServletRequest request, HttpServletResponse response) {}
        };
    }

    private record PendingExchange(String digest, Grant grant, Instant expiresAt) {}
}
