package com.seatsaga.inventory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * POST /api/admin/events/{eventId}/seat-types/{code}/add
 * Adds more seats to an existing seat type.
 */
public record AddSeatsRequest(

        @Min(1)
        @Max(5000)
        int quantity
) {}