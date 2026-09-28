package com.seatsaga.authservice.Controllers;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HealthControllerTest {

    private final HealthController healthController = new HealthController();

    @Test
    void testHealth() {
        ResponseEntity<String> response = healthController.health();
        assertEquals(200, response.getStatusCode().value());
        assertEquals("OK", response.getBody());
    }
}
