package com.seatsaga.bookings.dto;

public record HoldSeatRequest(
        long eventId,
        String seatTypeCode,
        int quantity,
        long userId,
        String orderId
) {}