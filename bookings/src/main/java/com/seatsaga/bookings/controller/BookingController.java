package com.seatsaga.bookings.controller;

import com.seatsaga.bookings.dto.BookingRequest;
import com.seatsaga.bookings.dto.BookingResponse;
import com.seatsaga.bookings.dto.BookingSummaryResponse;
import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.security.UserContext;
import com.seatsaga.bookings.service.BookingService;
import com.seatsaga.bookings.service.VerifyAndBook;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final VerifyAndBook verifyAndBook;
    private final BookingService bookingService;

    public BookingController(VerifyAndBook verifyAndBook, BookingService bookingService) {
        this.verifyAndBook = verifyAndBook;
        this.bookingService = bookingService;
    }

    /**
     * Create / hold seats.
     * The userId is extracted exclusively from the verified JWT (not accepted externally).
     */
    @PostMapping
    public BookingResponse bookSeats(@RequestBody BookingRequest request) {
        Long authenticatedUserId = UserContext.getUserId();
        return verifyAndBook.checkAvailability(request, authenticatedUserId);
    }

    /**
     * Get bookings for the authenticated user.
     * External userId from query param / header is not accepted; userId comes from the verified JWT.
     */
    @GetMapping
    public ResponseEntity<List<BookingSummaryResponse>> getBookings() {
        Long authenticatedUserId = UserContext.getUserId();
        List<Booking> bookings = bookingService.getBookingsByUserId(authenticatedUserId);

        List<BookingSummaryResponse> response = bookings.stream()
                .map(BookingSummaryResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Explicit endpoint to get all bookings for a user by their user ID.
     * Validates that the requested userId matches the authenticated user in the JWT.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getBookingsByUserId(@PathVariable("userId") Long userId) {
        Long authenticatedUserId = UserContext.getUserId();

        if (authenticatedUserId != null && !authenticatedUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "You are not authorized to view bookings for another user"));
        }

        List<BookingSummaryResponse> response = bookingService.getBookingsByUserId(userId)
                .stream()
                .map(BookingSummaryResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Lookup a booking by its unique orderId.
     * Validates that the booking belongs to the authenticated user.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getBookingByOrderId(@PathVariable("orderId") String orderId) {
        Long authenticatedUserId = UserContext.getUserId();

        Optional<Booking> opt = bookingService.getBookingByOrderId(orderId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Booking booking = opt.get();
        if (authenticatedUserId != null && !authenticatedUserId.equals(booking.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "You are not authorized to view this booking"));
        }

        return ResponseEntity.ok(BookingSummaryResponse.fromEntity(booking));
    }
}
