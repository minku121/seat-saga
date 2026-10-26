package com.seatsaga.bookings.dto;

public record BookingRequest(
        long eventId,
        String seatTypeCode,
        int quantity,
        long userId
) {}