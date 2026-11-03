package com.seatsaga.inventory.service;

import com.seatsaga.inventory.dto.EventSeatsResponse;
import com.seatsaga.inventory.dto.PaymentStatusEvent;
import com.seatsaga.inventory.entity.Event;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import com.seatsaga.inventory.entity.SeatType;
import com.seatsaga.inventory.repository.EventRepository;
import com.seatsaga.inventory.repository.SeatRepository;
import com.seatsaga.inventory.repository.SeatTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeatServiceTest {

    @Mock
    private SeatRepository seatRepo;

    @Mock
    private EventRepository eventRepo;

    @Mock
    private SeatTypeRepository seatTypeRepo;

    @InjectMocks
    private SeatService seatService;

    private Event testEvent;
    private SeatType testSeatType;
    private Seat heldSeat;

    @BeforeEach
    void setUp() {
        testEvent = new Event();
        testEvent.setId(1L);
        testEvent.setName("Rock Concert");
        testEvent.setMaxCapacity(50);

        testSeatType = new SeatType();
        testSeatType.setId(10L);
        testSeatType.setEvent(testEvent);
        testSeatType.setCode("VIP");
        testSeatType.setPrice(BigDecimal.valueOf(199.99));
        testSeatType.setTotalQuantity(10);
        testSeatType.setHeldQuantity(1);
        testSeatType.setBookedQuantity(0);

        heldSeat = new Seat();
        heldSeat.setId(100L);
        heldSeat.setEvent(testEvent);
        heldSeat.setSeatNumber("VIP-1");
        heldSeat.setSeatTypeCode("VIP");
        heldSeat.setStatus(SeatStatus.HELD);
        heldSeat.setHeldByUserId(34591L);
        heldSeat.setOrderId("ORD-12345");
        heldSeat.setHoldExpiresAt(Instant.now().plusSeconds(600));
    }

    @Test
    void processPaymentStatus_success_marksSeatBooked() {
        String orderId = "ORD-12345";
        PaymentStatusEvent event = new PaymentStatusEvent(
                orderId,
                1L,
                34591L,
                BigDecimal.valueOf(199.99),
                BigDecimal.valueOf(199.99),
                "SUCCESS",
                "SUCCESS",
                "CONFIRMED",
                "gateway-ord-1",
                "gateway-pay-1",
                null,
                "2026-11-03T07:11:02.494853780Z"
        );

        when(seatRepo.findByOrderIdWithEvent(orderId)).thenReturn(List.of(heldSeat));
        when(seatTypeRepo.findByEvent_IdAndCode(1L, "VIP")).thenReturn(Optional.of(testSeatType));
        when(seatRepo.save(any(Seat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        seatService.processPaymentStatus(orderId, event);

        assertThat(heldSeat.getStatus()).isEqualTo(SeatStatus.BOOKED);
        assertThat(heldSeat.getBookedBy()).isEqualTo(34591L);
        assertThat(heldSeat.getBookedAt()).isNotNull();
        assertThat(heldSeat.getHoldExpiresAt()).isNull();

        verify(seatTypeRepo).confirmHold(10L, 1);
        verify(seatRepo).save(heldSeat);
    }

    @Test
    void processPaymentStatus_failed_releasesSeatImmediately() {
        String orderId = "ORD-12345";
        PaymentStatusEvent event = new PaymentStatusEvent(
                orderId,
                1L,
                34591L,
                BigDecimal.valueOf(199.99),
                BigDecimal.valueOf(199.99),
                "FAILED",
                "FAILED",
                "FAILED",
                "gateway-ord-1",
                null,
                "Card declined",
                "2026-11-03T07:11:02.494853780Z"
        );

        when(seatRepo.findByOrderIdWithEvent(orderId)).thenReturn(List.of(heldSeat));
        when(seatTypeRepo.findByEvent_IdAndCode(1L, "VIP")).thenReturn(Optional.of(testSeatType));
        when(seatRepo.save(any(Seat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        seatService.processPaymentStatus(orderId, event);

        assertThat(heldSeat.getStatus()).isEqualTo(SeatStatus.CANCELLED);
        assertThat(heldSeat.getHoldExpiresAt()).isNull();

        verify(seatTypeRepo).releaseHold(10L, 1);
        verify(seatRepo).save(heldSeat);
    }

    @Test
    void processPaymentStatus_bookedTicketCancelled_releasesBookedQuantity() {
        String orderId = "ORD-12345";
        heldSeat.setStatus(SeatStatus.BOOKED);

        PaymentStatusEvent event = new PaymentStatusEvent(
                orderId,
                1L,
                34591L,
                BigDecimal.valueOf(199.99),
                BigDecimal.valueOf(199.99),
                "REFUNDED",
                "CANCELLED",
                "CANCELLED",
                "gateway-ord-1",
                "pay-1",
                "Customer requested refund",
                "2026-11-03T07:11:02.494853780Z"
        );

        when(seatRepo.findByOrderIdWithEvent(orderId)).thenReturn(List.of(heldSeat));
        when(seatTypeRepo.findByEvent_IdAndCode(1L, "VIP")).thenReturn(Optional.of(testSeatType));
        when(seatRepo.save(any(Seat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        seatService.processPaymentStatus(orderId, event);

        assertThat(heldSeat.getStatus()).isEqualTo(SeatStatus.CANCELLED);
        verify(seatTypeRepo).releaseBooked(10L, 1);
        verify(seatRepo).save(heldSeat);
    }

    @Test
    void releaseExpiredHolds_cron_releasesExpiredSeats() {
        heldSeat.setHoldExpiresAt(Instant.now().minusSeconds(10));
        when(seatRepo.findByStatusAndHoldExpiresAtBefore(eq(SeatStatus.HELD), any(Instant.class)))
                .thenReturn(List.of(heldSeat));
        when(seatTypeRepo.findByEvent_IdAndCode(1L, "VIP")).thenReturn(Optional.of(testSeatType));
        when(seatRepo.save(any(Seat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int released = seatService.releaseExpiredHolds();

        assertThat(released).isEqualTo(1);
        assertThat(heldSeat.getStatus()).isEqualTo(SeatStatus.CANCELLED);
        verify(seatTypeRepo).releaseHold(10L, 1);
        verify(seatRepo).save(heldSeat);
    }

    @Test
    void heldSeat_reusesPreviouslyCancelledSeatRow() {
        when(eventRepo.findById(1L)).thenReturn(Optional.of(testEvent));
        when(seatTypeRepo.findByEvent_IdAndCode(1L, "VIP")).thenReturn(Optional.of(testSeatType));
        when(seatTypeRepo.tryHold(10L, 1)).thenReturn(1);
        when(seatRepo.findActiveSeatNumbers(1L, "VIP")).thenReturn(Collections.emptySet());

        Seat cancelledSeat = new Seat();
        cancelledSeat.setId(50L);
        cancelledSeat.setSeatNumber("VIP-1");
        cancelledSeat.setStatus(SeatStatus.CANCELLED);

        when(seatRepo.findByEvent_IdAndSeatNumber(1L, "VIP-1")).thenReturn(Optional.of(cancelledSeat));
        when(seatRepo.save(any(Seat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Seat> result = seatService.heldSeat(1L, "VIP", 1, 999L, "ORD-NEW");

        assertThat(result).hasSize(1);
        Seat held = result.get(0);
        assertThat(held.getSeatNumber()).isEqualTo("VIP-1");
        assertThat(held.getStatus()).isEqualTo(SeatStatus.HELD);
        assertThat(held.getOrderId()).isEqualTo("ORD-NEW");
        assertThat(held.getHeldByUserId()).isEqualTo(999L);
    }

    @Test
    void getEventSeats_countsHeldNotCancelledInOccupied() {
        when(eventRepo.findById(1L)).thenReturn(Optional.of(testEvent));

        testSeatType.setTotalQuantity(10);
        testSeatType.setHeldQuantity(2);
        testSeatType.setBookedQuantity(3);
        // Available should be 10 - 2 - 3 = 5

        when(seatTypeRepo.findByEvent_IdOrderByIdAsc(1L)).thenReturn(List.of(testSeatType));

        Seat cancelled = new Seat();
        cancelled.setStatus(SeatStatus.CANCELLED);
        when(seatRepo.findAllByEventIdWithEvent(1L)).thenReturn(List.of(cancelled));

        EventSeatsResponse response = seatService.getEventSeats(1L);

        assertThat(response.totalCapacity()).isEqualTo(50);
        assertThat(response.availableSeats()).isEqualTo(5); // 10 - 2 - 3 = 5 (cancelled does NOT affect available)
        assertThat(response.heldSeats()).isEqualTo(2);
        assertThat(response.bookedSeats()).isEqualTo(3);
        assertThat(response.cancelledSeats()).isEqualTo(1);
    }
}
