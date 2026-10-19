package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.CreateEventRequest;
import com.seatsaga.inventory.dto.EventResponse;
import com.seatsaga.inventory.dto.UpdateEventRequest;
import com.seatsaga.inventory.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Secured Admin REST controller for managing events.
 * Requires JWT token with admin secret.
 *
 * POST   /api/admin/events           — create a new event
 * PUT    /api/admin/events/{eventId} — update event details
 * DELETE /api/admin/events/{eventId} — delete an event
 * GET    /api/admin/events           — list all events
 * GET    /api/admin/events/{eventId} — get event details
 */
@RestController
@RequestMapping("/api/admin/events")
public class AdminEventController {

    private final InventoryService inventoryService;

    public AdminEventController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /** Create a new event (Admin only). Returns 201 Created with Location header. */
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest request) {

        EventResponse created = inventoryService.createEvent(request);
        URI location = URI.create("/api/events/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    /** Update event details (Admin only). */
    @PutMapping("/{eventId}")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody UpdateEventRequest request) {

        return ResponseEntity.ok(inventoryService.updateEvent(eventId, request));
    }

    /** Delete an event by ID (Admin only). */
    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long eventId) {
        inventoryService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    /** List all events (Admin view). */
    @GetMapping
    public ResponseEntity<List<EventResponse>> listAllEvents() {
        return ResponseEntity.ok(inventoryService.getAllEvents());
    }

    /** Get event by ID (Admin view). */
    @GetMapping("/{eventId}")
    public ResponseEntity<EventResponse> getEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(inventoryService.getEventById(eventId));
    }
}
