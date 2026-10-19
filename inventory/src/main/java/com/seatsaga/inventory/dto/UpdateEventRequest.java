package com.seatsaga.inventory.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record UpdateEventRequest(

        @NotBlank(message = "Event name is required")
        @Size(max = 150, message = "Event name cannot exceed 150 characters")
        String name,

        @Size(max = 1000, message = "Description cannot exceed 1000 characters")
        String description,

        @NotBlank(message = "Venue is required")
        @Size(max = 255, message = "Venue cannot exceed 255 characters")
        String venue,

        @NotNull(message = "Max capacity is required")
        @Min(value = 1, message = "Max capacity must be at least 1")
        Integer maxCapacity,

        @NotNull(message = "Event date is required")
        @Future(message = "Event date must be in the future")
        LocalDateTime eventDate

) {}
