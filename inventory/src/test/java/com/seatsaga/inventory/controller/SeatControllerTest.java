package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.config.JwtUtil;
import com.seatsaga.inventory.dto.BookedSeatResponse;
import com.seatsaga.inventory.entity.Event;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import com.seatsaga.inventory.service.SeatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatControllerTest {

    @Mock
    private SeatService seatService;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private SeatController seatController;

    private Seat bookedSeat;

    @BeforeEach
    void setUp() {
        Event event = new Event();
        event.setId(1L);
        event.setName("Festival Night");

        bookedSeat = new Seat();
        bookedSeat.setId(1L);
        bookedSeat.setSeatNumber("A-1");
        bookedSeat.setStatus(SeatStatus.BOOKED);
        bookedSeat.setEvent(event);
        bookedSeat.setSeatTypeCode("VIP");
        bookedSeat.setOrderId("ORD-999");
        bookedSeat.setBookedBy(34591L);
        bookedSeat.setBookedAt(Instant.now());
    }

    @Test
    void getSeatsByOrderId_success() {
        when(seatService.getSeatsByOrderId("ORD-999")).thenReturn(List.of(bookedSeat));

        ResponseEntity<List<BookedSeatResponse>> response =
                seatController.getSeatsByOrderId("ORD-999", null, 34591L, null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).seatNumber()).isEqualTo("A-1");
        assertThat(response.getBody().get(0).orderId()).isEqualTo("ORD-999");
        assertThat(response.getBody().get(0).bookedBy()).isEqualTo(34591L);
    }

    @Test
    void getSeatsByOrderId_unauthorizedUser_throwsForbidden() {
        when(seatService.getSeatsByOrderId("ORD-999")).thenReturn(List.of(bookedSeat));
        when(jwtUtil.isRoleAdmin(null)).thenReturn(false);

        assertThatThrownBy(() ->
                seatController.getSeatsByOrderId("ORD-999", null, 88888L, null)
        ).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void getBookedSeats_withUserId_returnsUserSeats() {
        when(seatService.getBookedSeatsByUserId(34591L)).thenReturn(List.of(bookedSeat));

        ResponseEntity<List<BookedSeatResponse>> response =
                seatController.getBookedSeats(null, 34591L, null, null, null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).bookedBy()).isEqualTo(34591L);
    }
}

