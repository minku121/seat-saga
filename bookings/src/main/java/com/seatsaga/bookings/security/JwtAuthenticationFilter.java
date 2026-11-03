package com.seatsaga.bookings.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1)
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    public static final String AUTHENTICATED_USER_ID_ATTR = "authenticatedUserId";

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Allow CORS pre-flight requests and health endpoints
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.equals("/health")
                || path.equals("/api/health")
                || path.startsWith("/error");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing or invalid Authorization header on path: {}", request.getRequestURI());
            sendUnauthorized(response, "Authorization header with Bearer JWT token is required");
            return;
        }

        String token = authHeader.substring(7).trim();

        if (!jwtUtil.validateToken(token)) {
            log.warn("Failed JWT signature/expiration validation for request: {}", request.getRequestURI());
            sendUnauthorized(response, "Invalid or expired JWT token");
            return;
        }

        Long userId = jwtUtil.extractUserId(token);
        if (userId == null) {
            log.warn("JWT token valid but missing userId claim on request: {}", request.getRequestURI());
            sendUnauthorized(response, "JWT token does not contain a valid userId claim");
            return;
        }

        request.setAttribute(AUTHENTICATED_USER_ID_ATTR, userId);
        UserContext.setUserId(userId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(String.format(
                "{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"%s\"}", message
        ));
    }
}

