package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.AddSeatsRequest;
import com.seatsaga.inventory.dto.CreateSeatTypeRequest;
import com.seatsaga.inventory.dto.SeatTypeResponse;
import com.seatsaga.inventory.dto.UpdateSeatTypeRequest;
import com.seatsaga.inventory.service.SeatTypeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Secured Admin REST controller for managing seat types and seats within an event.
 * Requires JWT token with admin secret.
 *
 * POST   /api/admin/events/{eventId}/seat-types              — create seat type + generate seats
 * POST   /api/admin/events/{eventId}/seat-types/{code}/seats — add more seats to a type
 * PATCH  /api/admin/events/{eventId}/seat-types/{code}       — update seat type metadata
 * GET    /api/admin/events/{eventId}/seat-types              — list seat types for event
 */
@RestController
@RequestMapping("/api/admin/events/{eventId}/seat-types")
public class AdminSeatTypeController {

    private final SeatTypeService seatTypeService;

    public AdminSeatTypeController(SeatTypeService seatTypeService) {
        this.seatTypeService = seatTypeService;
    }

    /** Create a seat type for an event and auto-generate its seats (Admin only). Returns 201 Created. */
    @PostMapping
    public ResponseEntity<SeatTypeResponse> createSeatType(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateSeatTypeRequest request) {

        SeatTypeResponse created = seatTypeService.createSeatType(eventId, request);
        URI location = URI.create("/api/events/" + eventId + "/seat-types/" + created.code());
        return ResponseEntity.created(location).body(created);
    }

    /** Add more seats to an existing seat type (Admin only). */
    @PostMapping("/{code}/seats")
    public ResponseEntity<SeatTypeResponse> addSeatsToType(
            @PathVariable Long eventId,
            @PathVariable String code,
            @Valid @RequestBody AddSeatsRequest request) {

        return ResponseEntity.ok(seatTypeService.addSeats(eventId, code, request));
    }

    /** Partially update a seat type: name, description, price, or active flag (Admin only). */
    @PatchMapping("/{code}")
    public ResponseEntity<SeatTypeResponse> updateSeatType(
            @PathVariable Long eventId,
            @PathVariable String code,
            @Valid @RequestBody UpdateSeatTypeRequest request) {

        return ResponseEntity.ok(seatTypeService.updateSeatType(eventId, code, request));
    }

    /** List seat types for event (Admin view). */
    @GetMapping
    public ResponseEntity<List<SeatTypeResponse>> listSeatTypes(@PathVariable Long eventId) {
        return ResponseEntity.ok(seatTypeService.listByEvent(eventId));
    }
}
