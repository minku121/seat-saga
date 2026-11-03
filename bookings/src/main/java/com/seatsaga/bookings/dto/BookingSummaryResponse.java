package com.seatsaga.bookings.dto;

import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.entity.BookingStatus;
import com.seatsaga.bookings.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingSummaryResponse(
        UUID id,
        String orderId,
        Long userId,
        Long eventId,
        String seatTypeCode,
        Integer quantity,
        BigDecimal totalAmount,
        BookingStatus bookingStatus,
        PaymentStatus paymentStatus,
        String gatewayOrderId,
        String gatewayPaymentId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static BookingSummaryResponse fromEntity(Booking b) {
        if (b == null) {
            return null;
        }
        return new BookingSummaryResponse(
                b.getId(),
                b.getOrderId(),
                b.getUserId(),
                b.getEventId(),
                b.getSeatTypeCode(),
                b.getQuantity(),
                b.getTotalAmount(),
                b.getBookingStatus(),
                b.getPaymentStatus(),
                b.getGatewayOrderId(),
                b.getGatewayPaymentId(),
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }
}

