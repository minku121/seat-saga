
package com.seatsaga.inventory.dto;

import com.seatsaga.inventory.entity.Seat;

import java.math.BigDecimal;
import java.util.List;

public record HoldSeatResponse(
        List<Seat> heldSeats,
        BigDecimal totalAmount
) {}
