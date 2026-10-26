package com.seatsaga.inventory.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class JwtUtil {

    private final List<SecretKey> verificationKeys;
    private final SecretKey primarySigningKey;
    private final String rawSecret;
    private final long expirationMs = 24 * 60 * 60 * 1000L; // 24 hours

    public JwtUtil(@Value("${jwt.secret:admin-password}") String secret) {
        this.rawSecret = secret;
        this.verificationKeys = new ArrayList<>();

        // Primary key: SHA-256 derived 256-bit key from the secret string (works with any secret length)
        SecretKey sha256Key = createSha256Key(secret);
        this.primarySigningKey = sha256Key;
        this.verificationKeys.add(sha256Key);

        // Secondary fallback key: 32-byte zero-padded key in case external client zero-padded the secret
        byte[] rawBytes = secret.getBytes(StandardCharsets.UTF_8);
        byte[] padded = new byte[32];
        System.arraycopy(rawBytes, 0, padded, 0, Math.min(rawBytes.length, 32));
        this.verificationKeys.add(Keys.hmacShaKeyFor(padded));
    }

    private SecretKey createSha256Key(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public String generateToken(String subject) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", "ADMIN");
        return generateToken(subject, claims);
    }

    public String generateToken(String subject, Map<String, Object> extraClaims) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(primarySigningKey)
                .compact();
    }

    public boolean validateToken(String token) {
        for (SecretKey key : verificationKeys) {
            try {
                Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token);
                return true;
            } catch (JwtException | IllegalArgumentException ignored) {
                // Try next verification key
            }
        }
        return false;
    }

    public Claims extractAllClaims(String token) {
        for (SecretKey key : verificationKeys) {
            try {
                return Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (JwtException | IllegalArgumentException ignored) {
                // Try next key
            }
        }
        throw new IllegalArgumentException("Invalid JWT token");
    }

    public String extractSubject(String token) {
        try {
            return extractAllClaims(token).getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    public String getRawSecret() {
        return rawSecret;
    }
}
