package com.seatsaga.inventory.dto;

import com.seatsaga.inventory.entity.EventStatus;

import java.time.LocalDateTime;

public record EventResponse(
        Long id,
        String name,
        String description,
        String venue,
        Integer maxCapacity,
        LocalDateTime eventDate,
        EventStatus status
) {}
