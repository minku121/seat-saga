package com.seatsaga.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;


public record UpdateSeatTypeRequest(

        @Size(max = 100)
        String name,

        @Size(max = 255)
        String description,

        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 8, fraction = 2)
        BigDecimal price,

        Boolean active         
) {}