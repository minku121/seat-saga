package com.seatsaga.bookings.controller;

import com.seatsaga.bookings.dto.BookingRequest;
import com.seatsaga.bookings.dto.BookingResponse;
import com.seatsaga.bookings.dto.BookingSummaryResponse;
import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.service.BookingService;
import com.seatsaga.bookings.service.VerifyAndBook;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final VerifyAndBook verifyAndBook;
    private final BookingService bookingService;

    public BookingController(VerifyAndBook verifyAndBook, BookingService bookingService) {
        this.verifyAndBook = verifyAndBook;
        this.bookingService = bookingService;
    }

    @PostMapping
    public BookingResponse bookSeats(@RequestBody BookingRequest request) {
        return verifyAndBook.checkAvailability(request);
    }

    /**
     * Get bookings:
     * - If userId param or X-User-Id header is provided: returns bookings for that user
     * - Otherwise returns all bookings
     */ 
    @GetMapping
    public ResponseEntity<List<BookingSummaryResponse>> getBookings(
            @RequestParam(name = "userId", required = false) Long userId,
            @RequestHeader(name = "X-User-Id", required = false) Long headerUserId) {

        Long effectiveUserId = userId != null ? userId : headerUserId;
        List<Booking> bookings;
        if (effectiveUserId != null) {
            bookings = bookingService.getBookingsByUserId(effectiveUserId);
        } else {
            bookings = bookingService.getAllBookings();
        }

        List<BookingSummaryResponse> response = bookings.stream()
                .map(BookingSummaryResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Explicit endpoint to get all bookings for a user by their user ID.
     * Example: GET /api/bookings/user/34591
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookingSummaryResponse>> getBookingsByUserId(
            @PathVariable("userId") Long userId) {

        List<BookingSummaryResponse> response = bookingService.getBookingsByUserId(userId)
                .stream()
                .map(BookingSummaryResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Lookup a booking by its unique orderId.
     * Example: GET /api/bookings/order/ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<BookingSummaryResponse> getBookingByOrderId(
            @PathVariable("orderId") String orderId) {

        return bookingService.getBookingByOrderId(orderId)
                .map(BookingSummaryResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
