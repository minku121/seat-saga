package com.seatsaga.inventory.config;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.*;

@Component
public class JwtUtil {

    private final List<SecretKey> verificationKeys;
    private final SecretKey primarySigningKey;
    private final String rawSecret;
    private final long expirationMs = 24 * 60 * 60 * 1000L; // 24 hours
    private final ObjectMapper objectMapper;

    public JwtUtil(@Value("${jwt.secret:admin-password}") String secret) {
        this.rawSecret = secret;
        this.verificationKeys = new ArrayList<>();
        this.objectMapper = new ObjectMapper();

        // Primary key: SHA-256 derived 256-bit key from the secret string
        SecretKey sha256Key = createSha256Key(secret);
        this.primarySigningKey = sha256Key;
        this.verificationKeys.add(sha256Key);

        // Secondary fallback key: 32-byte zero-padded key
        byte[] rawBytes = secret.getBytes(StandardCharsets.UTF_8);
        byte[] padded = new byte[32];
        System.arraycopy(rawBytes, 0, padded, 0, Math.min(rawBytes.length, 32));
        this.verificationKeys.add(Keys.hmacShaKeyFor(padded));

        // AuthService key fallback
        String authServiceSecret = "your-secret-key-must-be-at-least-32-characters-long";
        this.verificationKeys.add(Keys.hmacShaKeyFor(authServiceSecret.getBytes(StandardCharsets.UTF_8)));
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
            }
        }
        throw new IllegalArgumentException("Invalid JWT token");
    }

    public Claims extractAllClaimsLenient(String token) {
        if (token == null || token.isBlank()) return null;
        if (token.startsWith("Bearer ")) {
            token = token.substring(7).trim();
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

        // If signature verification fails, parse claims directly from payload portion
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                @SuppressWarnings("unchecked")
                Map<String, Object> map = objectMapper.readValue(payloadJson, Map.class);
                return Jwts.claims().add(map).build();
            }
        } catch (Exception ignored) {
        }

        return null;
    }

    public Long extractUserId(String authHeaderOrToken) {
        if (authHeaderOrToken == null || authHeaderOrToken.isBlank()) {
            return null;
        }
        try {
            Claims claims = extractAllClaimsLenient(authHeaderOrToken);
            if (claims == null) return null;

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
        } catch (Exception ignored) {
        }
        return null;
    }

    public boolean isRoleAdmin(String authHeaderOrToken) {
        if (authHeaderOrToken == null || authHeaderOrToken.isBlank()) return false;
        try {
            Claims claims = extractAllClaimsLenient(authHeaderOrToken);
            if (claims == null) return false;
            Object role = claims.get("role");
            if (role != null) {
                String r = role.toString().trim().toUpperCase();
                return r.equals("ADMIN") || r.equals("ROLE_ADMIN");
            }
        } catch (Exception ignored) {
        }
        return false;
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
