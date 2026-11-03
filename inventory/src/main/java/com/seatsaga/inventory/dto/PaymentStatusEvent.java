package com.seatsaga.inventory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PaymentStatusEvent(
        String orderId,
        Long eventId,
        Long userId,
        BigDecimal amount,
        BigDecimal totalAmount,
        String paymentStatus,
        String status,
        String bookingStatus,
        String gatewayOrderId,
        String gatewayPaymentId,
        String failureReason,
        String timestamp
) {
}

