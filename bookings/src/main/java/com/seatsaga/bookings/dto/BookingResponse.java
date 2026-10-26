package com.seatsaga.bookings.dto;

import java.math.BigDecimal;
import java.util.List;

public record BookingResponse(
        String orderId,
        long eventId,
        String seatTypeCode,
        int quantity,
        BigDecimal totalAmount,
        long userId,
        List<Long> seatIds,
        List<String> seatNumbers,
        String status
) {}