package com.seatsaga.bookings.repository;

import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.entity.BookingStatus;
import com.seatsaga.bookings.entity.PaymentStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findByOrderId(String orderId);

    List<Booking> findByUserId(Long userId);

    List<Booking> findByBookingStatus(BookingStatus bookingStatus);

    List<Booking> findByPaymentStatus(PaymentStatus paymentStatus);

    List<Booking> findByUserIdAndBookingStatus(
            Long userId,
            BookingStatus bookingStatus
    );
}
