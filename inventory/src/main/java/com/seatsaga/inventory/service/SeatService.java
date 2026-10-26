
package com.seatsaga.inventory.service;

import com.seatsaga.inventory.dto.HoldSeatResponse;
import com.seatsaga.inventory.entity.Event;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import com.seatsaga.inventory.entity.SeatType;

import com.seatsaga.inventory.repository.EventRepository;
import com.seatsaga.inventory.repository.SeatRepository;
import com.seatsaga.inventory.repository.SeatTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class SeatService {

    private final SeatRepository seatRepo;
    private final EventRepository eventRepo;
    private final SeatTypeRepository seatTypeRepo;


    public SeatService(
            SeatRepository seatRepo,
            EventRepository eventRepo,
            SeatTypeRepository seatTypeRepo
          ) {
        this.seatRepo = seatRepo;
        this.eventRepo = eventRepo;
        this.seatTypeRepo = seatTypeRepo;

    }
    @Transactional
    public List<Seat> heldSeat(
            Long eventId,
            String seatTypeCode,
            int quantity,
            Long userId) {
        return heldSeat(eventId, seatTypeCode, quantity, userId, null);
    }

    @Transactional
    public List<Seat> heldSeat(
            Long eventId,
            String seatTypeCode,
            int quantity,
            Long userId,
            String orderId) {

        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Valid userId is required.");
        }

        if (eventId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Event ID must not be null.");
        }

        if (seatTypeCode == null || seatTypeCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Seat type code is required.");
        }

        if (quantity <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Quantity must be greater than zero.");
        }

        String normalizedCode = seatTypeCode.trim().toUpperCase();

        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        SeatType seatType = seatTypeRepo
                .findByEvent_IdAndCode(eventId, normalizedCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat type not found: " + normalizedCode));

        int updated = seatTypeRepo.tryHold(seatType.getId(), quantity);

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Not enough available seats for: " + normalizedCode);
        }

        long currentCount =
                seatRepo.countByEvent_IdAndSeatTypeCode(eventId, normalizedCode);

        Instant holdExpiresAt = Instant.now().plus(Duration.ofMinutes(10));

        List<Seat> seats = new ArrayList<>();

        for (int i = 1; i <= quantity; i++) {
            Seat seat = new Seat();
            seat.setEvent(event);
            seat.setSeatTypeCode(normalizedCode);
            seat.setSeatNumber(normalizedCode + "-" + (currentCount + i));
            seat.setStatus(SeatStatus.HELD);
            seat.setHeldByUserId(userId);
            seat.setHoldExpiresAt(holdExpiresAt);
            seat.setOrderId(orderId);

            seats.add(seatRepo.save(seat));
        }




        return seats;
    }


    @Transactional
    public HoldSeatResponse holdSeatsWithAmount(
            Long eventId,
            String seatTypeCode,
            int quantity,
            Long userId,
            String orderId) {

        // Get the authoritative price before holding seats
        String normalizedCode = seatTypeCode.trim().toUpperCase();

        SeatType seatType = seatTypeRepo
                .findByEvent_IdAndCode(eventId, normalizedCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat type not found: " + normalizedCode));

        // Hold the seats using your existing business logic
        List<Seat> seats = heldSeat(
                eventId,
                normalizedCode,
                quantity,
                userId,
                orderId
        );

        // Calculate total price
        BigDecimal totalAmount = seatType.getPrice()
                .multiply(BigDecimal.valueOf(quantity));

        return new HoldSeatResponse(seats, totalAmount);
    }

}
