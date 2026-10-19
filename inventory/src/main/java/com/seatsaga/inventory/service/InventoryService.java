package com.seatsaga.inventory.service;

import com.seatsaga.inventory.dto.CreateEventRequest;
import com.seatsaga.inventory.dto.EventResponse;
import com.seatsaga.inventory.dto.UpdateEventRequest;
import com.seatsaga.inventory.entity.Event;
import com.seatsaga.inventory.entity.EventStatus;
import com.seatsaga.inventory.repository.EventRepository;
import com.seatsaga.inventory.repository.SeatTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class InventoryService {

    private final EventRepository eventRepository;
    private final SeatTypeRepository seatTypeRepository;

    public InventoryService(EventRepository eventRepository,
                            SeatTypeRepository seatTypeRepository) {
        this.eventRepository = eventRepository;
        this.seatTypeRepository = seatTypeRepository;
    }

    @Transactional
    public EventResponse createEvent(CreateEventRequest request) {
        Event event = new Event();

        event.setName(request.name());
        event.setDescription(request.description());
        event.setVenue(request.venue());
        event.setMaxCapacity(request.maxCapacity());
        event.setEventDate(request.eventDate());
        event.setStatus(EventStatus.DRAFT);

        return toEventResponse(eventRepository.save(event));
    }

    @Transactional
    public EventResponse updateEvent(Long eventId, UpdateEventRequest request) {
        Event event = findEvent(eventId);

        // Do not allow lowering capacity below what is already allocated to seat types
        long allocated = seatTypeRepository.sumTotalQuantityByEventId(eventId);
        if (request.maxCapacity() < allocated) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Max capacity cannot be less than already allocated seats (" + allocated + ")");
        }

        event.setName(request.name());
        event.setDescription(request.description());
        event.setVenue(request.venue());
        event.setMaxCapacity(request.maxCapacity());
        event.setEventDate(request.eventDate());

        return toEventResponse(eventRepository.save(event));
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll()
                .stream()
                .map(this::toEventResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(Long eventId) {
        return toEventResponse(findEvent(eventId));
    }

    @Transactional
    public void deleteEvent(Long eventId) {
        Event event = findEvent(eventId);
        eventRepository.delete(event);   // the database cascade removes the seat types
    }

    private Event findEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Event not found with ID: " + eventId));
    }

    private EventResponse toEventResponse(Event event) {
        return new EventResponse(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getVenue(),
                event.getMaxCapacity(),
                event.getEventDate(),
                event.getStatus()
        );
    }
}