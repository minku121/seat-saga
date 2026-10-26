package com.seatsaga.bookings.controller;

import com.seatsaga.bookings.dto.BookingRequest;
import com.seatsaga.bookings.dto.BookingResponse;
import com.seatsaga.bookings.service.VerifyAndBook;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final VerifyAndBook verifyAndBook;

    public BookingController(VerifyAndBook verifyAndBook) {
        this.verifyAndBook = verifyAndBook;
    }

    @PostMapping
    public BookingResponse bookSeats(
            @RequestBody BookingRequest request) {

        return verifyAndBook.checkAvailability(request);
    }
}