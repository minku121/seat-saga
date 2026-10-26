package com.seatsaga.inventory.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HoldSeatRequest {

    @JsonAlias({"eventid", "event_id"})
    private Long eventId;

    @JsonAlias({"seat_type_code", "seattypecode"})
    private String seatTypeCode;

    private int quantity;

    @NotNull(message = "userId is required")
    @Positive(message = "userId must be positive")
    @JsonAlias({"user_id", "userid"})
    private Long userId;

    private String token;
    private String orderId;
}