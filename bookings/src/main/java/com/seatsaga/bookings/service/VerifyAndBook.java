
package com.seatsaga.bookings.service;

import com.seatsaga.bookings.kafka.SeatEventProducer;
import com.seatsaga.bookings.dto.BookingRequest;
import com.seatsaga.bookings.dto.BookingResponse;
import com.seatsaga.bookings.dto.HoldSeatRequest;
import com.seatsaga.bookings.dto.HoldSeatResponse;
import com.seatsaga.bookings.dto.HeldSeat;
import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.entity.BookingStatus;
import com.seatsaga.bookings.entity.PaymentStatus;
import com.seatsaga.bookings.repository.BookingRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class VerifyAndBook {

    private final SeatEventProducer seatEventProducer;
    private final BookingRepository bookingRepository;
    private final RestClient inventoryClient;

    public VerifyAndBook(
            SeatEventProducer seatEventProducer,
            BookingRepository bookingRepository,
            @Value("${inventory.baseUrl}") String baseUrl) {

        this.seatEventProducer = seatEventProducer;
        this.bookingRepository = bookingRepository;
        this.inventoryClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public BookingResponse checkAvailability(BookingRequest request) {

        long eventId = request.eventId();
        String seatCode = request.seatTypeCode();
        int quantity = request.quantity();
        long userId = request.userId();

        if (quantity <= 0) {
            throw new IllegalArgumentException(
                    "Quantity must be greater than zero");
        }

        // 1. Check availability
        Boolean available = inventoryClient.get()
                .uri(
                        "/api/events/{eventId}/seat-types/{seatCode}/availability?quantity={quantity}",
                        eventId, seatCode, quantity
                )
                .retrieve()
                .body(Boolean.class);

        if (!Boolean.TRUE.equals(available)) {
            throw new IllegalStateException("Seats are not available");
        }

        // 2. Generate order ID
        String orderId = "ORD-" + UUID.randomUUID();

        // 3. Create hold request
        HoldSeatRequest holdRequest = new HoldSeatRequest(
                eventId,
                seatCode,
                quantity,
                userId,
                orderId
        );

        // 4. Hold seats and receive the total amount
        HoldSeatResponse holdResponse = inventoryClient.post()
                .uri("/api/seat/held-seat")
                .body(holdRequest)
                .retrieve()
                .body(HoldSeatResponse.class);

        if (holdResponse == null
                || holdResponse.heldSeats() == null
                || holdResponse.heldSeats().size() != quantity
                || holdResponse.totalAmount() == null
                || holdResponse.totalAmount().signum() < 0) {
            throw new IllegalStateException(
                    "Inventory returned an invalid hold response");
        }

        List<HeldSeat> heldSeats = holdResponse.heldSeats();
        BigDecimal totalAmount = holdResponse.totalAmount();

        List<Long> seatIds = heldSeats.stream()
                .map(HeldSeat::id)
                .toList();

        List<String> seatNumbers = heldSeats.stream()
                .map(HeldSeat::seatNumber)
                .toList();

        // 5. Save booking to PostgreSQL
        Booking booking = new Booking();
        booking.setOrderId(orderId);
        booking.setUserId(userId);
        booking.setEventId(eventId);
        booking.setSeatTypeCode(seatCode);
        booking.setQuantity(quantity);
        booking.setTotalAmount(totalAmount);
        booking.setBookingStatus(BookingStatus.PENDING);
        booking.setPaymentStatus(PaymentStatus.PENDING);

        bookingRepository.save(booking);

        // 6. Publish Kafka event only after saving
        seatEventProducer.publishSeatsHeld(
                eventId,
                seatIds,
                seatNumbers,
                userId,
                orderId,
                totalAmount
        );

        // 7. Return booking response
        return new BookingResponse(
                orderId,
                eventId,
                seatCode,
                quantity,
                totalAmount,
                userId,
                seatIds,
                seatNumbers,
                "SEATS_HELD"
        );
    }
}
