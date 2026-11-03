package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.EventResponse;
import com.seatsaga.inventory.dto.EventSeatsResponse;
import com.seatsaga.inventory.service.InventoryService;
import com.seatsaga.inventory.service.SeatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public REST controller for browsing events and their seat availability.
 * No authentication required.
 *
 * GET /api/events           — list all events
 * GET /api/events/{eventId} — get event details
 * GET /api/events/{eventId}/seats — get event seat map & capacity summary (held vs booked vs available)
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final InventoryService inventoryService;
    private final SeatService seatService;

    public EventController(InventoryService inventoryService, SeatService seatService) {
        this.inventoryService = inventoryService;
        this.seatService = seatService;
    }

    /** List all events (Public). */
    @GetMapping
    public ResponseEntity<List<EventResponse>> listAllEvents() {
        return ResponseEntity.ok(inventoryService.getAllEvents());
    }

    /** Get a single event by ID (Public). */
    @GetMapping("/{eventId}")
    public ResponseEntity<EventResponse> getEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(inventoryService.getEventById(eventId));
    }

    /** Get seat availability & real-time seat status for an event (Public). */
    @GetMapping("/{eventId}/seats")
    public ResponseEntity<EventSeatsResponse> getEventSeats(@PathVariable Long eventId) {
        return ResponseEntity.ok(seatService.getEventSeats(eventId));
    }
}
