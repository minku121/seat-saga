package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.SeatTypeResponse;
import com.seatsaga.inventory.service.SeatTypeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public REST controller for viewing seat types of an event.
 * No authentication required.
 *
 * GET /api/events/{eventId}/seat-types — list all seat types for an event
 */
@RestController
@RequestMapping("/api/events/{eventId}/seat-types")
public class SeatTypeController {

    private final SeatTypeService seatTypeService;

    public SeatTypeController(SeatTypeService seatTypeService) {
        this.seatTypeService = seatTypeService;
    }

    /** List all seat types for a given event, including available/held/booked counts (Public). */
    @GetMapping
    public ResponseEntity<List<SeatTypeResponse>> listSeatTypes(@PathVariable Long eventId) {
        return ResponseEntity.ok(seatTypeService.listByEvent(eventId));
    }

    @GetMapping("/{seatTypeCode}/availability")
    public ResponseEntity<Boolean> isSeatAvailable(
            @PathVariable Long eventId,
            @PathVariable String seatTypeCode,
            @RequestParam int quantity) {

        if (quantity <= 0) {
            return ResponseEntity.badRequest().body(false);
        }

        boolean available = seatTypeService.isSeatAvailable(
                eventId, seatTypeCode, quantity
        );

        return ResponseEntity.ok(available);
    }
}
