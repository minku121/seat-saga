package com.seatsaga.inventory.dto;

import java.util.List;

public record EventSeatsResponse(
        Long eventId,
        String eventName,
        int totalCapacity,
        int availableSeats,
        int heldSeats,
        int bookedSeats,
        int cancelledSeats,
        List<BookedSeatResponse> seats
) {
}

