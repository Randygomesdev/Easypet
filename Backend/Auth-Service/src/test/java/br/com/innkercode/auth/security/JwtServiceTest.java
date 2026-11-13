package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SHARED = "s02-test-shared-signature-key-32-bytes";
    private static final String TEAM = "s02-test-team-signature-key-32-bytes";

    private final JwtService jwt = new JwtService(SHARED, TEAM, 60_000L);

    @Test
    void teamTokensAreOnlyAcceptedByAuthAndContainTheSessionVersion() {
        var user = user(UserRole.TEAM_MEMBER);
        String token = jwt.generateToken(user);

        assertThat(jwt.verify(token).get("sessionVersion", Integer.class)).isEqualTo(4);
        assertThatThrownBy(() -> Jwts.parser().verifyWith(key(SHARED)).build().parseSignedClaims(token))
                .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> jwt.verify(Jwts.builder().claim("role", "TEAM_MEMBER")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key(SHARED)).compact()))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void ownerTokensKeepTheirExistingClaimsAndSignature() {
        var user = user(UserRole.PARTNER);
        var claims = Jwts.parser().verifyWith(key(SHARED)).build()
                .parseSignedClaims(jwt.generateToken(user)).getPayload();

        assertThat(claims.get("role")).isEqualTo("PARTNER");
        assertThat(claims.get("userId")).isEqualTo(user.getId().toString());
        assertThat(claims.getSubject()).isEqualTo(user.getEmail());
    }

    private javax.crypto.SecretKey key(String value) {
        return Keys.hmacShaKeyFor(value.getBytes(StandardCharsets.UTF_8));
    }

    private User user(UserRole role) {
        return User.builder().id(UUID.randomUUID()).email("user@example.test").name("Teste")
                .role(role).sessionVersion(4).build();
    }
}
