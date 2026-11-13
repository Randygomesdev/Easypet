package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.PasswordResetToken;
import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.repository.PasswordResetTokenRepository;
import br.com.innkercode.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordRecoveryService {

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final AccountCredentials credentials;
    private final EmailService emailService;
    private final ApplicationEventPublisher events;

    @Transactional
    public void request(String email) {
        emailService.requireEnabled();
        if (!emailService.canSendTo(email.trim())) {
            return;
        }
        String trimmed = email.trim();
        users.findIdByExactEmail(trimmed)
                .or(() -> users.findIdByExactEmail(AccountCredentials.normalizeEmail(trimmed)))
                .or(() -> users.findUniqueLegacyEmailId(trimmed))
                .flatMap(users::findByIdForUpdate)
                .filter(User::isEnabled)
                .ifPresent(this::issue);
    }

    private void issue(User user) {
        LocalDateTime now = LocalDateTime.now();
        tokens.replaceOutstanding(user.getId(), now);
        String token = OneTimeTokens.generate();
        tokens.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(OneTimeTokens.digest(token))
                .expiryDate(now.plusHours(24))
                .build());
        events.publishEvent(new EmailService.PasswordResetMail(user.getEmail(), user.getName(), token));
    }

    @Transactional(readOnly = true)
    public void validate(String token) {
        PasswordResetToken reset = findUsableToken(OneTimeTokens.digest(token));
        if (!reset.getUser().isEnabled()) {
            throw invalid();
        }
    }

    @Transactional
    public void reset(String token, String newPassword) {
        String digest = OneTimeTokens.digest(token);
        UUID userId = tokens.findUserIdByTokenHash(digest).orElseThrow(PasswordRecoveryService::invalid);
        // Issuance and consumption use the same lock order, starting with the account row.
        User user = users.findByIdForUpdate(userId).orElseThrow(PasswordRecoveryService::invalid);
        PasswordResetToken reset = findUsableToken(digest);
        if (!user.isEnabled()) {
            throw invalid();
        }
        user.setPassword(credentials.encodePassword(newPassword));
        user.invalidateSessions();
        reset.setUsedAt(LocalDateTime.now());
    }

    private PasswordResetToken findUsableToken(String digest) {
        PasswordResetToken reset = tokens.findByTokenHash(digest).orElseThrow(PasswordRecoveryService::invalid);
        if (reset.getUsedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RESET_TOKEN_USED", "Este link já foi utilizado.");
        }
        if (reset.getReplacedAt() != null) {
            throw invalid();
        }
        if (reset.isExpired()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RESET_TOKEN_EXPIRED", "Este link expirou.");
        }
        return reset;
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "RESET_TOKEN_INVALID", "Este link é inválido.");
    }
}
