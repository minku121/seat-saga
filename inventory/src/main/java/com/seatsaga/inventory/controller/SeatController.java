
package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.HoldSeatRequest;
import com.seatsaga.inventory.dto.HoldSeatResponse;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.service.SeatService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/seat")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
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
}
