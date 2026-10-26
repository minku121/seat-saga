package com.seatsaga.inventory.repository;

import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    boolean existsByEvent_IdAndSeatNumber(Long eventId, String seatNumber);

    List<Seat> findByEvent_IdAndSeatTypeCodeAndStatus(
            Long eventId,
            String seatTypeCode,
            SeatStatus status
    );

    long countByEvent_IdAndSeatTypeCodeAndStatus(
            Long eventId,
            String seatTypeCode,
            SeatStatus status
    );

    long countByEvent_IdAndSeatTypeCode(
            Long eventId,
            String seatTypeCode
    );

    List<Seat> findByHeldByUserId(Long heldByUserId);

    List<Seat> findByEvent_IdAndSeatTypeCodeAndHeldByUserIdAndStatus(
            Long eventId,
            String seatTypeCode,
            Long heldByUserId,
            SeatStatus status
    );
}