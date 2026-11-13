package br.com.innkercode.auth.service;

import br.com.innkercode.auth.config.GoogleAuthSettings;
import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.response.AuthenticationResponse;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.google-auth.enabled", havingValue = "true")
public class GoogleAccountService {

    private final UserRepository users;
    private final GoogleAuthSettings settings;
    private final JwtService jwt;

    public record Grant(UUID userId, String subject, String email, UserRole role, int sessionVersion) {}

    @Transactional
    public Grant authorize(OidcUser principal) {
        String subject = principal.getIdToken().getSubject();
        String verifiedAddress = principal.getIdToken().getEmail();
        if (subject == null || subject.isBlank() || subject.length() > 255 || verifiedAddress == null
                || !Boolean.TRUE.equals(principal.getIdToken().getEmailVerified())) {
            throw rejected();
        }
        String email = AccountCredentials.normalizeEmail(verifiedAddress);
        String workspace = principal.getIdToken().getClaimAsString("hd");
        if (!settings.allowedEmails().contains(email)
                || (!email.endsWith("@gmail.com") && (workspace == null || workspace.isBlank()))) {
            throw rejected();
        }

        var accounts = users.findGoogleAccountsForUpdate(email);
        if (accounts.size() != 1) throw rejected();
        User user = accounts.getFirst();
        if (!eligible(user)) throw rejected();

        if (user.getGoogleSubject() == null && !users.existsByGoogleSubject(subject)) {
            user.setGoogleSubject(subject);
        }
        if (!subject.equals(user.getGoogleSubject())) throw rejected();

        return new Grant(user.getId(), subject, email, user.getRole(), user.getSessionVersion());
    }

    @Transactional(readOnly = true)
    public AuthenticationResponse exchange(Grant grant) {
        User user = users.findById(grant.userId()).filter(this::eligible)
                .filter(account -> grant.subject().equals(account.getGoogleSubject())
                        && grant.email().equals(AccountCredentials.normalizeEmail(account.getEmail()))
                        && grant.role() == account.getRole() && grant.sessionVersion() == account.getSessionVersion())
                .orElseThrow(GoogleAccountService::rejected);
        return new AuthenticationResponse(jwt.generateToken(user), user.getId(), user.getName(),
                user.getEmail(), user.getRole().name(), user.getPictureUrl());
    }

    private boolean eligible(User user) {
        return user.isEnabled()
                && switch (user.getRole()) {
                    case ADMIN, PARTNER, CUSTOMER -> true;
                    case TEAM_MEMBER, USER -> false;
                };
    }

    private static ApiException rejected() {
        return ApiException.invalidSession();
    }
}
