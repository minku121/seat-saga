package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.EventResponse;
import com.seatsaga.inventory.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public REST controller for browsing events.
 * No authentication required.
 *
 * GET /api/events           — list all events
 * GET /api/events/{eventId} — get event details
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final InventoryService inventoryService;

    public EventController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
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
}
