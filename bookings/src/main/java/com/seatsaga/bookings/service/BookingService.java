package com.seatsaga.bookings.service;

import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.entity.BookingStatus;
import com.seatsaga.bookings.entity.PaymentStatus;
import com.seatsaga.bookings.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;

    public BookingService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> getBookingsByUserId(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public Optional<Booking> getBookingByOrderId(String orderId) {
        return bookingRepository.findByOrderId(orderId);
    }

    @Transactional
    public Optional<Booking> processPaymentStatus(
            String orderId,
            String paymentStatusStr,
            String bookingStatusStr,
            String gatewayOrderId,
            String gatewayPaymentId) {

        if (orderId == null || orderId.isBlank()) {
            log.warn("Cannot process payment status: orderId is null or blank");
            return Optional.empty();
        }

        Optional<Booking> optBooking = bookingRepository.findByOrderId(orderId);
        if (optBooking.isEmpty()) {
            log.warn("Booking not found for orderId: {}", orderId);
            return Optional.empty();
        }

        Booking booking = optBooking.get();
        log.info("Updating booking for orderId {}: incoming paymentStatus={}, bookingStatus={}, gatewayOrderId={}, gatewayPaymentId={}",
                orderId, paymentStatusStr, bookingStatusStr, gatewayOrderId, gatewayPaymentId);

        boolean isSuccess = "SUCCESS".equalsIgnoreCase(paymentStatusStr)
                || "PAID".equalsIgnoreCase(paymentStatusStr)
                || "CONFIRMED".equalsIgnoreCase(bookingStatusStr);

        boolean isFailed = "FAILED".equalsIgnoreCase(paymentStatusStr)
                || "CANCELLED".equalsIgnoreCase(paymentStatusStr)
                || "CANCELLED".equalsIgnoreCase(bookingStatusStr);

        if (isSuccess) {
            booking.setPaymentStatus(PaymentStatus.SUCCESS);
            booking.setBookingStatus(BookingStatus.CONFIRMED);
        } else if (isFailed) {
            booking.setPaymentStatus(PaymentStatus.FAILED);
            booking.setBookingStatus(BookingStatus.CANCELLED);
        } else if ("INITIATED".equalsIgnoreCase(paymentStatusStr)) {
            booking.setPaymentStatus(PaymentStatus.PENDING);
        } else {
            if (paymentStatusStr != null) {
                try {
                    booking.setPaymentStatus(PaymentStatus.valueOf(paymentStatusStr.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown paymentStatus: {}", paymentStatusStr);
                }
            }
            if (bookingStatusStr != null) {
                try {
                    booking.setBookingStatus(BookingStatus.valueOf(bookingStatusStr.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown bookingStatus: {}", bookingStatusStr);
                }
            }
        }

        if (gatewayOrderId != null && !gatewayOrderId.isBlank()) {
            booking.setGatewayOrderId(gatewayOrderId);
        }
        if (gatewayPaymentId != null && !gatewayPaymentId.isBlank()) {
            booking.setGatewayPaymentId(gatewayPaymentId);
        }

        Booking saved = bookingRepository.save(booking);
        log.info("Successfully updated booking for orderId {}: paymentStatus={}, bookingStatus={}, gatewayOrderId={}, gatewayPaymentId={}",
                orderId, saved.getPaymentStatus(), saved.getBookingStatus(), saved.getGatewayOrderId(), saved.getGatewayPaymentId());

        return Optional.of(saved);
    }
}
