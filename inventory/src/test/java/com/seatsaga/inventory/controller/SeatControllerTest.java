package com.seatsaga.inventory.controller;

import com.seatsaga.inventory.dto.HoldSeatRequest;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import com.seatsaga.inventory.service.SeatService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatControllerTest {

    @Mock
    private SeatService seatService;

    @InjectMocks
    private SeatController seatController;

    @Test
    void held_withUserIdInBody_callsServiceWithPassedUserId() {
        HoldSeatRequest request = new HoldSeatRequest();
        request.setEventId(8L);
        request.setSeatTypeCode("VIP");
        request.setQuantity(2);
        request.setUserId(100L);

        Seat seat1 = new Seat();
        seat1.setId(10L);
        seat1.setStatus(SeatStatus.HELD);
        seat1.setHeldByUserId(100L);

        when(seatService.heldSeat(8L, "VIP", 2, 100L, null)).thenReturn(List.of(seat1));

        ResponseEntity<List<Seat>> response = seatController.held(null, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getHeldByUserId()).isEqualTo(100L);

        verify(seatService).heldSeat(8L, "VIP", 2, 100L, null);
    }

    @Test
    void held_withHeaderUserId_callsServiceWithHeaderUserId() {
        HoldSeatRequest request = new HoldSeatRequest();
        request.setEventId(8L);
        request.setSeatTypeCode("VIP");
        request.setQuantity(2);

        when(seatService.heldSeat(8L, "VIP", 2, 55L, null)).thenReturn(List.of());

        ResponseEntity<List<Seat>> response = seatController.held(55L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(seatService).heldSeat(8L, "VIP", 2, 55L, null);
    }
}
