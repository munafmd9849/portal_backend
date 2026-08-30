package com.pwioi.portal.security;

import com.pwioi.portal.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final AppProperties props;

    public JwtService(AppProperties props) {
        this.props = props;
    }

    public String generateAccessToken(String userId, String role, String status, int sessionVersion) {
        return sign(props.getJwt().getSecret(), Map.of(
                "userId", userId,
                "type", "access",
                "role", role,
                "status", status,
                "sessionVersion", sessionVersion
        ), parseDuration(props.getJwt().getExpiresIn(), Duration.ofHours(1)));
    }

    public String generateRefreshToken(String userId) {
        // jti keeps tokens unique even when two logins happen within the same second
        return sign(props.getJwt().getRefreshSecret(), Map.of(
                "userId", userId,
                "type", "refresh",
                "jti", java.util.UUID.randomUUID().toString()
        ), parseDuration(props.getJwt().getRefreshExpiresIn(), Duration.ofDays(7)));
    }

    public String generateVerificationToken(String email) {
        return sign(props.getJwt().getSecret(), Map.of(
                "email", email,
                "type", "verification"
        ), Duration.ofMinutes(10));
    }

    public Claims parseAccess(String token) {
        return parse(props.getJwt().getSecret(), token);
    }

    public Claims parseRefresh(String token) {
        return parse(props.getJwt().getRefreshSecret(), token);
    }

    public Instant expiresAt(String token, boolean refresh) {
        Claims c = refresh ? parseRefresh(token) : parseAccess(token);
        return c.getExpiration().toInstant();
    }

    private String sign(String secret, Map<String, Object> claims, Duration ttl) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .claims(claims)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key(secret));
        return builder.compact();
    }

    private Claims parse(String secret, String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key(secret))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw e;
        } catch (JwtException e) {
            throw e;
        }
    }

    /** Match Node jsonwebtoken HMAC-SHA256 (secret string used as-is). */
    private SecretKey key(String secret) {
        byte[] bytes = (secret == null ? "" : secret).getBytes(StandardCharsets.UTF_8);
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    static Duration parseDuration(String raw, Duration fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        raw = raw.trim();
        try {
            if (raw.endsWith("ms")) {
                return Duration.ofMillis(Long.parseLong(raw.substring(0, raw.length() - 2)));
            }
            char unit = raw.charAt(raw.length() - 1);
            long n = Long.parseLong(raw.substring(0, raw.length() - 1));
            return switch (unit) {
                case 's' -> Duration.ofSeconds(n);
                case 'm' -> Duration.ofMinutes(n);
                case 'h' -> Duration.ofHours(n);
                case 'd' -> Duration.ofDays(n);
                default -> Duration.parse(raw);
            };
        } catch (Exception e) {
            return fallback;
        }
    }
}
