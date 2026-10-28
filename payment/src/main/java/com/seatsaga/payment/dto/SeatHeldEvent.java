package com.seatsaga.payment.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SeatHeldEvent(
        Long eventId,
        List<Long> seatIds,
        List<String> seatNumbers,
        Long userId,
        String orderId,
        @JsonAlias("amount")
        BigDecimal totalAmount,
        String status,
        Integer quantity
) {}
