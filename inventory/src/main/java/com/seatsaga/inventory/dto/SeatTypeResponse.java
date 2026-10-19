package com.seatsaga.inventory.dto;

import com.seatsaga.inventory.entity.SeatType;

import java.math.BigDecimal;
import java.time.Instant;

public record SeatTypeResponse(
        Long id, Long eventId, String code, String name, String description,
        BigDecimal price, int totalQuantity,
        int available, int held, int booked,
        boolean active, Instant createdAt
) {
    public static SeatTypeResponse from(SeatType t) {
        return new SeatTypeResponse(
                t.getId(),
                t.getEvent().getId(),
                t.getCode(),
                t.getName(),
                t.getDescription(),
                t.getPrice(),
                t.getTotalQuantity(),
                t.getAvailableQuantity(),
                t.getHeldQuantity(),
                t.getBookedQuantity(),
                t.isActive(),
                t.getCreatedAt());
    }
}