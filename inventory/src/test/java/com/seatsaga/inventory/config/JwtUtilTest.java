package com.seatsaga.inventory.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private final String adminSecret = "admin-password";
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(adminSecret);
    }

    @Test
    void validateToken_validatesAdminToken() {
        String adminToken = jwtUtil.generateToken("admin");

        assertThat(jwtUtil.validateToken(adminToken)).isTrue();
        assertThat(jwtUtil.extractSubject(adminToken)).isEqualTo("admin");
    }

    @Test
    void validateToken_rejectsTamperedOrInvalidToken() {
        assertThat(jwtUtil.validateToken("invalid.jwt.token")).isFalse();
    }
}
