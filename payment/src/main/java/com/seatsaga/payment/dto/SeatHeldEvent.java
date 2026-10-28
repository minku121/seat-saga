package com.seatsaga.payment.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SeatHeldEvent(
        long eventId,
        List<Long> seatIds,
        List<String> seatNumbers,
        long userId,
        String orderId,
        @JsonAlias("amount")
        BigDecimal totalAmount
) {}