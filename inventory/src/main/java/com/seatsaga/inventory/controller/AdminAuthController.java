package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.config.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final JwtUtil jwtUtil;
    private final String expectedSecret;

    public AdminAuthController(JwtUtil jwtUtil, @Value("${jwt.secret:admin-key}") String expectedSecret) {
        this.jwtUtil = jwtUtil;
        this.expectedSecret = expectedSecret;
    }

    
    @PostMapping("/token")
    public ResponseEntity<?> generateToken(
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String secret,
            @RequestHeader(value = "X-Admin-Key", required = false) String headerSecret) {

        String providedSecret = null;
        if (body != null && body.containsKey("secret")) {
            providedSecret = body.get("secret");
        } else if (secret != null && !secret.isBlank()) {
            providedSecret = secret;
        } else if (headerSecret != null && !headerSecret.isBlank()) {
            providedSecret = headerSecret;
        }

        if (providedSecret == null || !expectedSecret.equals(providedSecret.trim())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Invalid secret key. Provide the correct admin secret key."
            ));
        }

        String token = jwtUtil.generateToken("admin");
        return ResponseEntity.ok(Map.of(
                "token", token,
                "tokenType", "Bearer",
                "expiresIn", 86400,
                "message", "Admin JWT created successfully. Pass in header: Authorization: Bearer <token>"
        ));
    }
}
