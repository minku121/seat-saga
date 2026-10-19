package com.seatsaga.inventory.repository;

import com.seatsaga.inventory.entity.SeatType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SeatTypeRepository extends JpaRepository<SeatType, Long> {

    boolean existsByEvent_IdAndCode(Long eventId, String code);

    Optional<SeatType> findByEvent_IdAndCode(Long eventId, String code);

    List<SeatType> findByEvent_IdOrderByIdAsc(Long eventId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from SeatType t join fetch t.event where t.event.id = :eventId and t.code = :code")
    Optional<SeatType> findForUpdate(@Param("eventId") Long eventId, @Param("code") String code);

    @Query("select coalesce(sum(t.totalQuantity), 0) from SeatType t where t.event.id = :eventId")
    long sumTotalQuantityByEventId(@Param("eventId") Long eventId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update SeatType s
           set s.heldQuantity = s.heldQuantity + :qty
         where s.id = :id
           and s.active = true
           and (s.totalQuantity - s.heldQuantity - s.bookedQuantity) >= :qty
        """)
    int tryHold(@Param("id") Long id, @Param("qty") int qty);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update SeatType s
           set s.heldQuantity = s.heldQuantity - :qty,
               s.bookedQuantity = s.bookedQuantity + :qty
         where s.id = :id and s.heldQuantity >= :qty
        """)
    int confirmHold(@Param("id") Long id, @Param("qty") int qty);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update SeatType s
           set s.heldQuantity = s.heldQuantity - :qty
         where s.id = :id and s.heldQuantity >= :qty
        """)
    int releaseHold(@Param("id") Long id, @Param("qty") int qty);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update SeatType s
           set s.bookedQuantity = s.bookedQuantity - :qty
         where s.id = :id and s.bookedQuantity >= :qty
        """)
    int releaseBooked(@Param("id") Long id, @Param("qty") int qty);
}