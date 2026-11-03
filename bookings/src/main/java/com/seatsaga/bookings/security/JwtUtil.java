package com.seatsaga.bookings.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    private final List<SecretKey> verificationKeys = new ArrayList<>();
    private final SecretKey primarySigningKey;

    public JwtUtil(@Value("${jwt.secret:seatsaga4-seatsaga4-seatsaga4-seatsaga4}") String secret) {
        if (secret == null || secret.isBlank()) {
            secret = "seatsaga4-seatsaga4-seatsaga4-seatsaga4";
        }

        byte[] rawBytes = secret.getBytes(StandardCharsets.UTF_8);

        // 1. Raw bytes if >= 32 bytes (256-bit), or zero-padded if shorter
        SecretKey directKey;
        if (rawBytes.length >= 32) {
            directKey = Keys.hmacShaKeyFor(rawBytes);
        } else {
            byte[] padded = new byte[32];
            System.arraycopy(rawBytes, 0, padded, 0, rawBytes.length);
            directKey = Keys.hmacShaKeyFor(padded);
        }
        this.primarySigningKey = directKey;
        this.verificationKeys.add(directKey);

        // 2. SHA-256 derived 256-bit key from secret
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawBytes);
            this.verificationKeys.add(Keys.hmacShaKeyFor(hash));
        } catch (NoSuchAlgorithmException e) {
            log.warn("SHA-256 algorithm not available for JWT key generation", e);
        }

        // 3. Fallback to authService default key if distinct
        String fallback = "seatsaga4-seatsaga4-seatsaga4-seatsaga4";
        if (!fallback.equals(secret)) {
            this.verificationKeys.add(Keys.hmacShaKeyFor(fallback.getBytes(StandardCharsets.UTF_8)));
        }
    }

    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        for (SecretKey key : verificationKeys) {
            try {
                Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token);
                return true;
            } catch (JwtException | IllegalArgumentException ignored) {
            }
        }
        return false;
    }

    public Claims extractAllClaims(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        for (SecretKey key : verificationKeys) {
            try {
                return Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (JwtException | IllegalArgumentException ignored) {
            }
        }
        return null;
    }

    public Long extractUserId(String authHeaderOrToken) {
        if (authHeaderOrToken == null || authHeaderOrToken.isBlank()) {
            return null;
        }
        String token = authHeaderOrToken.startsWith("Bearer ")
                ? authHeaderOrToken.substring(7).trim()
                : authHeaderOrToken.trim();

        Claims claims = extractAllClaims(token);
        if (claims == null) {
            return null;
        }

        // authService sets claim("userId", user.getId())
        Object val = claims.get("userId");
        if (val == null) val = claims.get("user_id");
        if (val == null) val = claims.get("id");
        if (val == null) val = claims.get("sub");

        if (val != null) {
            try {
                return Long.parseLong(val.toString().trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    public String extractSubject(String authHeaderOrToken) {
        if (authHeaderOrToken == null || authHeaderOrToken.isBlank()) {
            return null;
        }
        String token = authHeaderOrToken.startsWith("Bearer ")
                ? authHeaderOrToken.substring(7).trim()
                : authHeaderOrToken.trim();

        Claims claims = extractAllClaims(token);
        return claims != null ? claims.getSubject() : null;
    }

    public String generateTokenForTest(Long userId, String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email != null ? email : "user@example.com")
                .claim("userId", userId)
                .issuedAt(new Date(now))
                .expiration(new Date(now + 86400000L))
                .signWith(primarySigningKey)
                .compact();
    }
}

