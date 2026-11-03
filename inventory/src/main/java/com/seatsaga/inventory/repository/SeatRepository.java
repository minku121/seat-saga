package com.seatsaga.inventory.repository;

import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    boolean existsByEvent_IdAndSeatNumber(Long eventId, String seatNumber);

    Optional<Seat> findByEvent_IdAndSeatNumber(Long eventId, String seatNumber);

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

    @Query("SELECT s.seatNumber FROM Seat s WHERE s.event.id = :eventId AND s.seatTypeCode = :seatTypeCode AND s.status IN ('HELD', 'BOOKED')")
    Set<String> findActiveSeatNumbers(@Param("eventId") Long eventId, @Param("seatTypeCode") String seatTypeCode);

    @Query("SELECT COUNT(s) FROM Seat s WHERE s.event.id = :eventId AND s.seatTypeCode = :seatTypeCode AND s.status IN ('HELD', 'BOOKED')")
    long countActiveSeats(@Param("eventId") Long eventId, @Param("seatTypeCode") String seatTypeCode);

    List<Seat> findByHeldByUserId(Long heldByUserId);

    List<Seat> findByEvent_IdAndSeatTypeCodeAndHeldByUserIdAndStatus(
            Long eventId,
            String seatTypeCode,
            Long heldByUserId,
            SeatStatus status
    );

    List<Seat> findByOrderId(String orderId);

    List<Seat> findByOrderIdAndStatus(String orderId, SeatStatus status);

    List<Seat> findByBookedBy(Long bookedBy);

    List<Seat> findByBookedByAndStatus(Long bookedBy, SeatStatus status);

    List<Seat> findByHeldByUserIdOrBookedBy(Long heldByUserId, Long bookedBy);

    List<Seat> findByStatus(SeatStatus status);

    List<Seat> findByEvent_IdAndStatus(Long eventId, SeatStatus status);

    List<Seat> findByStatusAndHoldExpiresAtBefore(SeatStatus status, Instant time);

    @Query("SELECT s FROM Seat s JOIN FETCH s.event WHERE s.orderId = :orderId")
    List<Seat> findByOrderIdWithEvent(@Param("orderId") String orderId);

    @Query("SELECT s FROM Seat s JOIN FETCH s.event WHERE s.bookedBy = :userId OR (s.heldByUserId = :userId AND s.status = :status)")
    List<Seat> findUserSeatsWithEvent(@Param("userId") Long userId, @Param("status") SeatStatus status);

    @Query("SELECT s FROM Seat s JOIN FETCH s.event WHERE s.event.id = :eventId")
    List<Seat> findAllByEventIdWithEvent(@Param("eventId") Long eventId);

    @Query("SELECT s FROM Seat s JOIN FETCH s.event WHERE s.event.id = :eventId AND s.status IN ('HELD', 'BOOKED')")
    List<Seat> findActiveSeatsWithEvent(@Param("eventId") Long eventId);
}
