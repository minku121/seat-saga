package com.seatsaga.inventory.service;

import com.seatsaga.inventory.dto.AddSeatsRequest;
import com.seatsaga.inventory.dto.CreateSeatTypeRequest;
import com.seatsaga.inventory.dto.SeatTypeResponse;
import com.seatsaga.inventory.dto.UpdateSeatTypeRequest;
import com.seatsaga.inventory.entity.*;
import com.seatsaga.inventory.repository.EventRepository;
import com.seatsaga.inventory.repository.SeatTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class SeatTypeService {

    private final SeatTypeRepository seatTypeRepo;
    private final EventRepository eventRepo;

    public SeatTypeService(SeatTypeRepository seatTypeRepo, EventRepository eventRepo) {
        this.seatTypeRepo = seatTypeRepo;
        this.eventRepo = eventRepo;
    }

    @Transactional
    public SeatTypeResponse createSeatType(Long eventId, CreateSeatTypeRequest request) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));
        assertEventEditable(event);

        String code = request.code().trim().toUpperCase();
        if (seatTypeRepo.existsByEvent_IdAndCode(eventId, code)) {
            throw new IllegalStateException("Seat type " + code + " already exists for this event");
        }
        assertWithinCapacity(event, request.quantity());

        SeatType type = new SeatType();
        type.setEvent(event);
        type.setCode(code);
        type.setName(request.name().trim());
        type.setDescription(request.description());
        type.setPrice(request.price());
        type.setActive(true);
        type.setTotalQuantity(request.quantity());

        return SeatTypeResponse.from(seatTypeRepo.save(type));
    }

    @Transactional
    public SeatTypeResponse addSeats(Long eventId, String code, AddSeatsRequest request) {
        SeatType type = seatTypeRepo.findForUpdate(eventId, code.trim().toUpperCase())
                .orElseThrow(() -> new EntityNotFoundException("Seat type not found: " + code));

        assertEventEditable(type.getEvent());
        assertWithinCapacity(type.getEvent(), request.quantity());

        type.setTotalQuantity(type.getTotalQuantity() + request.quantity());
        return SeatTypeResponse.from(type);
    }

    @Transactional
    public SeatTypeResponse updateSeatType(Long eventId, String code, UpdateSeatTypeRequest request) {
        SeatType type = seatTypeRepo.findByEvent_IdAndCode(eventId, code.trim().toUpperCase())
                .orElseThrow(() -> new EntityNotFoundException("Seat type not found: " + code));

        if (request.name() != null)        type.setName(request.name().trim());
        if (request.description() != null) type.setDescription(request.description());
        if (request.price() != null)       type.setPrice(request.price());
        if (request.active() != null)      type.setActive(request.active());

        return SeatTypeResponse.from(type);
    }

    @Transactional(readOnly = true)
    public List<SeatTypeResponse> listByEvent(Long eventId) {
        if (!eventRepo.existsById(eventId)) {
            throw new EntityNotFoundException("Event not found: " + eventId);
        }
        return seatTypeRepo.findByEvent_IdOrderByIdAsc(eventId).stream()
                .map(SeatTypeResponse::from)
                .toList();
    }

    private void assertEventEditable(Event event) {
        if (event.getStatus() == EventStatus.CANCELLED || event.getStatus() == EventStatus.COMPLETED) {
            throw new IllegalStateException("Cannot change seats of a " + event.getStatus() + " event");
        }
    }

    private void assertWithinCapacity(Event event, int toAdd) {
        long existing = seatTypeRepo.sumTotalQuantityByEventId(event.getId());
        if (existing + toAdd > event.getMaxCapacity()) {
            throw new IllegalStateException("Exceeds event capacity of " + event.getMaxCapacity()
                    + " (already allocated " + existing + ")");
        }
    }
}