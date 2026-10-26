
package com.seatsaga.bookings.dto;

import java.math.BigDecimal;
import java.util.List;

public record HoldSeatResponse(
        List<HeldSeat> heldSeats,
        BigDecimal totalAmount
) {}
