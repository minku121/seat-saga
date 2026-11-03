package com.seatsaga.inventory.dto;

import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;

import java.time.Instant;

public record BookedSeatResponse(
        Long id,
        String seatNumber,
        SeatStatus status,
        Long eventId,
        String eventName,
        String seatTypeCode,
        Long heldByUserId,
        Long bookedBy,
        Instant bookedAt,
        Instant holdExpiresAt,
        String orderId
) {
    public static BookedSeatResponse fromEntity(Seat seat) {
        if (seat == null) return null;
        return new BookedSeatResponse(
                seat.getId(),
                seat.getSeatNumber(),
                seat.getStatus(),
                seat.getEvent() != null ? seat.getEvent().getId() : null,
                seat.getEvent() != null ? seat.getEvent().getName() : null,
                seat.getSeatTypeCode(),
                seat.getHeldByUserId(),
                seat.getBookedBy(),
                seat.getBookedAt(),
                seat.getHoldExpiresAt(),
                seat.getOrderId()
        );
    }
}

