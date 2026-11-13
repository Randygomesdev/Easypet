package br.com.innkercode.auth.service;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.exception.ApiException;
import br.com.innkercode.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AccountCredentials {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public Optional<User> findByEmail(String email) {
        String trimmed = email.trim();
        return users.findByEmail(trimmed).or(() -> users.findByEmail(normalizeEmail(trimmed)))
                .or(() -> users.findUniqueLegacyEmail(trimmed));
    }

    public String encodePassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_LONG", "A senha deve ter até 72 bytes.");
        }
        return passwordEncoder.encode(password);
    }

    public User create(User user) {
        try {
            return users.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            if (ex.getCause() instanceof org.hibernate.exception.ConstraintViolationException violation
                    && "users_email_key".equals(violation.getConstraintName())) {
                throw ApiException.emailTaken();
            }
            throw ex;
        }
    }
}
