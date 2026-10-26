package com.seatsaga.inventory.service;

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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeatServiceTest {

    @Mock
    private SeatRepository seatRepo;

    @Mock
    private EventRepository eventRepo;

    @Mock
    private SeatTypeRepository seatTypeRepo;

    @Mock
    private com.seatsaga.inventory.kafka.SeatEventProducer seatEventProducer;

    private SeatService seatService;

    @BeforeEach
    void setUp() {
        seatService = new SeatService(seatRepo, eventRepo, seatTypeRepo, seatEventProducer);
    }

    @Test
    void heldSeat_withoutUserId_throwsBadRequest() {
        assertThatThrownBy(() -> seatService.heldSeat(8L, "VIP", 1, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void heldSeat_zeroOrNegativeUserId_throwsBadRequest() {
        assertThatThrownBy(() -> seatService.heldSeat(8L, "VIP", 1, 0L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        assertThatThrownBy(() -> seatService.heldSeat(8L, "VIP", 1, -5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void heldSeat_withPassedUserId_mapsDirectlyToHeldByUserId() {
        Long eventId = 10L;
        String seatTypeCode = "VIP";
        int quantity = 2;
        Long userId = 77L;

        Event event = new Event();
        event.setId(eventId);

        SeatType seatType = new SeatType();
        seatType.setId(5L);
        seatType.setCode("VIP");
        seatType.setEvent(event);

        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event));
        when(seatTypeRepo.findByEvent_IdAndCode(eventId, "VIP")).thenReturn(Optional.of(seatType));
        when(seatTypeRepo.tryHold(5L, quantity)).thenReturn(1);
        when(seatRepo.countByEvent_IdAndSeatTypeCode(eventId, "VIP")).thenReturn(3L);
        when(seatRepo.save(any(Seat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Seat> heldSeats = seatService.heldSeat(eventId, seatTypeCode, quantity, userId);

        assertThat(heldSeats).hasSize(2);

        Seat first = heldSeats.get(0);
        assertThat(first.getSeatNumber()).isEqualTo("VIP-4");
        assertThat(first.getStatus()).isEqualTo(SeatStatus.HELD);
        assertThat(first.getHeldByUserId()).isEqualTo(userId);
        assertThat(first.getHoldExpiresAt()).isNotNull();

        Seat second = heldSeats.get(1);
        assertThat(second.getSeatNumber()).isEqualTo("VIP-5");
        assertThat(second.getStatus()).isEqualTo(SeatStatus.HELD);
        assertThat(second.getHeldByUserId()).isEqualTo(userId);
        assertThat(second.getHoldExpiresAt()).isNotNull();

        verify(seatTypeRepo).tryHold(5L, quantity);
        verify(seatRepo, times(2)).save(any(Seat.class));
    }

    @Test
    void heldSeat_missingEventId_throwsBadRequest() {
        assertThatThrownBy(() -> seatService.heldSeat(null, "VIP", 2, 77L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void heldSeat_notEnoughSeats_throwsBadRequest() {
        Long eventId = 10L;
        String seatTypeCode = "VIP";
        int quantity = 100;
        Long userId = 77L;

        Event event = new Event();
        event.setId(eventId);

        SeatType seatType = new SeatType();
        seatType.setId(5L);
        seatType.setCode("VIP");

        when(eventRepo.findById(eventId)).thenReturn(Optional.of(event));
        when(seatTypeRepo.findByEvent_IdAndCode(eventId, "VIP")).thenReturn(Optional.of(seatType));
        when(seatTypeRepo.tryHold(5L, quantity)).thenReturn(0);

        assertThatThrownBy(() -> seatService.heldSeat(eventId, seatTypeCode, quantity, userId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
