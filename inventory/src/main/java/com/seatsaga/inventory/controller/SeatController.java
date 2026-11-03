package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.config.JwtUtil;
import com.seatsaga.inventory.dto.BookedSeatResponse;
import com.seatsaga.inventory.dto.EventSeatsResponse;
import com.seatsaga.inventory.dto.HoldSeatRequest;
import com.seatsaga.inventory.dto.HoldSeatResponse;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.service.SeatService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/seat")
public class SeatController {

    private final SeatService seatService;
    private final JwtUtil jwtUtil;

    public SeatController(SeatService seatService, JwtUtil jwtUtil) {
        this.seatService = seatService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/held-seat")
    public ResponseEntity<HoldSeatResponse> held(
            @RequestHeader(value = "X-User-Id", required = false)
            Long headerUserId,
            @RequestBody HoldSeatRequest request) {

        Long effectiveUserId =
                request.getUserId() != null
                        ? request.getUserId()
                        : headerUserId;

        HoldSeatResponse response = seatService.holdSeatsWithAmount(
                request.getEventId(),
                request.getSeatTypeCode(),
                request.getQuantity(),
                effectiveUserId,
                request.getOrderId()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Get booked/held seats by orderId.
     * Optionally validates that the requesting user matches the booking if userId is present in JWT or headers.
     * Accessible via both /api/seat/order/{orderId} and /api/seat/booked/{orderId}
     */
    @GetMapping({"/order/{orderId}", "/booked/{orderId}"})
    public ResponseEntity<List<BookedSeatResponse>> getSeatsByOrderId(
            @PathVariable("orderId") String orderId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(value = "userId", required = false) Long queryUserId) {

        Long effectiveUserId = resolveEffectiveUserId(authHeader, headerUserId, queryUserId);

        List<Seat> seats = seatService.getSeatsByOrderId(orderId);
        if (seats.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No seats found for orderId: " + orderId);
        }

        // If a specific non-admin userId is resolved, verify ownership
        boolean isAdmin = jwtUtil.isRoleAdmin(authHeader);
        if (effectiveUserId != null && !isAdmin) {
            boolean belongsToUser = seats.stream().anyMatch(s ->
                    (s.getBookedBy() != null && s.getBookedBy().equals(effectiveUserId))
                    || (s.getHeldByUserId() != null && s.getHeldByUserId().equals(effectiveUserId)));

            if (!belongsToUser) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to view seats for this order");
            }
        }

        List<BookedSeatResponse> response = seats.stream()
                .map(BookedSeatResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Get booked seats:
     * - If orderId provided: returns seats for that order.
     * - If user authenticated (via JWT or X-User-Id / query param): returns user's booked seats.
     * - Otherwise (or if admin): returns all booked seats (optionally filtered by eventId).
     */
    @GetMapping("/booked")
    public ResponseEntity<List<BookedSeatResponse>> getBookedSeats(
            @RequestParam(value = "orderId", required = false) String orderId,
            @RequestParam(value = "userId", required = false) Long queryUserId,
            @RequestParam(value = "eventId", required = false) Long eventId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {

        if (orderId != null && !orderId.isBlank()) {
            return getSeatsByOrderId(orderId.trim(), authHeader, headerUserId, queryUserId);
        }

        Long effectiveUserId = resolveEffectiveUserId(authHeader, headerUserId, queryUserId);

        List<Seat> seats;
        if (effectiveUserId != null) {
            seats = seatService.getBookedSeatsByUserId(effectiveUserId);
        } else {
            seats = seatService.getAllBookedSeats(eventId);
        }

        List<BookedSeatResponse> response = seats.stream()
                .map(BookedSeatResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Explicit endpoint to get all seats for a given user ID.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookedSeatResponse>> getSeatsByUserId(
            @PathVariable("userId") Long userId) {

        List<Seat> seats = seatService.getBookedSeatsByUserId(userId);
        List<BookedSeatResponse> response = seats.stream()
                .map(BookedSeatResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Get seat availability map and capacity breakdown for an event (Public).
     * Held and booked seats are counted as occupied; canceled seats are strictly excluded from occupied seats.
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<EventSeatsResponse> getEventSeats(
            @PathVariable("eventId") Long eventId) {

        return ResponseEntity.ok(seatService.getEventSeats(eventId));
    }

    private Long resolveEffectiveUserId(String authHeader, Long headerUserId, Long queryUserId) {
        if (queryUserId != null && queryUserId > 0) {
            return queryUserId;
        }
        if (headerUserId != null && headerUserId > 0) {
            return headerUserId;
        }
        if (authHeader != null && !authHeader.isBlank()) {
            Long jwtUserId = jwtUtil.extractUserId(authHeader);
            if (jwtUserId != null && jwtUserId > 0) {
                return jwtUserId;
            }
        }
        return null;
    }
}
