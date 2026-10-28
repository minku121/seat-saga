package com.seatsaga.payment.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.Instant;

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
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant timestamp
) {

    public static PaymentStatusEvent success(
            String orderId,
            Long eventId,
            Long userId,
            BigDecimal amount,
            String gatewayOrderId,
            String gatewayPaymentId) {
        return new PaymentStatusEvent(
                orderId,
                eventId,
                userId,
                amount,
                amount,
                "SUCCESS",
                "SUCCESS",
                "CONFIRMED",
                gatewayOrderId,
                gatewayPaymentId,
                null,
                Instant.now()
        );
    }

    public static PaymentStatusEvent failed(
            String orderId,
            Long eventId,
            Long userId,
            BigDecimal amount,
            String gatewayOrderId,
            String gatewayPaymentId,
            String failureReason) {
        return new PaymentStatusEvent(
                orderId,
                eventId,
                userId,
                amount,
                amount,
                "FAILED",
                "FAILED",
                "CANCELLED",
                gatewayOrderId,
                gatewayPaymentId,
                failureReason,
                Instant.now()
        );
    }
}
