package com.seatsaga.inventory.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * POST /api/admin/events/{eventId}/seat-types
 * Creates the seat type and generates `quantity` seats.
 */
public record CreateSeatTypeRequest(

        @NotBlank
        @Size(max = 30)
        @Pattern(regexp = "^[A-Za-z0-9_]+$",
                message = "code may contain only letters, digits and underscore")
        String code,                // VIP, PREMIUM, TIER_A, TIER_B

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 255)
        String description,

        @NotNull
        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 8, fraction = 2)
        BigDecimal price,

        @Min(1)
        @Max(5000)
        int quantity                // seats to generate now
) {}