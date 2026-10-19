package com.seatsaga.inventory.dto;

import com.seatsaga.inventory.entity.EventStatus;

import java.time.LocalDateTime;
import java.util.List;

public record EventDetailResponse(
        Long id,
        String name,
        String description,
        String venue,
        Integer maxCapacity,
        LocalDateTime eventDate,
        EventStatus status,
        List<SeatTypeResponse> seatTypes
) {}