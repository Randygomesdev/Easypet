package br.com.innkercode.auth.security;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.ProtectedHeader;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    private static final String TEAM_KEY_ID = "easypet-team";

    private final SecretKey sharedKey;
    private final SecretKey teamKey;
    private final long expiration;

    public JwtService(
            @Value("${spring.security.jwt.secret}") String sharedSecret,
            @Value("${app.team-jwt-secret}") String teamSecret,
            @Value("${spring.security.jwt.expiration}") long expiration) {
        if (sharedSecret.equals(teamSecret)) {
            throw new IllegalArgumentException("AUTH_TEAM_JWT_SECRET deve ser distinto de JWT_SECRET.");
        }
        this.sharedKey = key(sharedSecret);
        this.teamKey = teamSecret.isBlank() ? Jwts.SIG.HS256.key().build() : key(teamSecret);
        this.expiration = expiration;
    }

    public String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("userId", user.getId().toString());
        claims.put("name", user.getName());
        claims.put("sessionVersion", user.getSessionVersion());
        if (user.getPictureUrl() != null) {
            claims.put("pictureUrl", user.getPictureUrl());
        }

        long now = System.currentTimeMillis();
        var builder = Jwts.builder()
                .claims(claims)
                .subject(user.getUsername())
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiration));
        if (user.getRole() == UserRole.TEAM_MEMBER) {
            return builder.header().keyId(TEAM_KEY_ID).and().signWith(teamKey).compact();
        }
        return builder.signWith(sharedKey).compact();
    }

    public Claims verify(String token) {
        var signed = Jwts.parser().keyLocator(new LocatorAdapter<Key>() {
            @Override
            public Key locate(ProtectedHeader header) {
                return TEAM_KEY_ID.equals(header.getKeyId()) ? teamKey : sharedKey;
            }
        }).build().parseSignedClaims(token);
        Claims claims = signed.getPayload();
        boolean team = TEAM_KEY_ID.equals(signed.getHeader().getKeyId());
        if (claims.getExpiration() == null || team != UserRole.TEAM_MEMBER.name().equals(claims.get("role"))) {
            throw new JwtException("Tipo de sessão inválido.");
        }
        return claims;
    }

    private SecretKey key(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
