package com.seatsaga.bookings.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthenticationTest {

    private JwtUtil jwtUtil;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil("seatsaga4-seatsaga4-seatsaga4-seatsaga4");
        filter = new JwtAuthenticationFilter(jwtUtil);
    }

    @Test
    void testExtractUserIdFromValidToken() {
        Long expectedUserId = 34591L;
        String token = jwtUtil.generateTokenForTest(expectedUserId, "user@example.com");

        assertTrue(jwtUtil.validateToken(token));
        assertEquals(expectedUserId, jwtUtil.extractUserId(token));
    }

    @Test
    void testFilterAllowsPublicHealthEndpointWithoutToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        assertNotNull(filterChain.getRequest());
    }

    @Test
    void testFilterBlocksBookingApiWithoutToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bookings");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Authorization header with Bearer JWT token is required"));
        assertNull(filterChain.getRequest());
    }

    @Test
    void testFilterBlocksBookingApiWithInvalidToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bookings");
        request.addHeader("Authorization", "Bearer invalid.token.value");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid or expired JWT token"));
        assertNull(filterChain.getRequest());
    }

    @Test
    void testFilterAllowsBookingApiWithValidTokenAndSetsUserId() throws Exception {
        Long expectedUserId = 34591L;
        String token = jwtUtil.generateTokenForTest(expectedUserId, "user@example.com");

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bookings");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        assertNotNull(filterChain.getRequest());
        assertEquals(expectedUserId, filterChain.getRequest().getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR));
    }
}

