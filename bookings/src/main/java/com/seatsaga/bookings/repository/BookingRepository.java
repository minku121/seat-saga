package com.seatsaga.bookings.repository;

import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.entity.BookingStatus;
import com.seatsaga.bookings.entity.PaymentStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByUserId(UUID userId);

    List<Booking> findByBookingStatus(BookingStatus bookingStatus);

    List<Booking> findByPaymentStatus(PaymentStatus paymentStatus);

    List<Booking> findByUserIdAndBookingStatus(
            UUID userId,
            BookingStatus bookingStatus
    );
}