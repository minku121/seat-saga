
package com.seatsaga.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(
        name = "seats",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_seat_event_number",
                        columnNames = {"event_id", "seat_number"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seat_number", nullable = false, length = 30)
    private String seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "seat_type_code", nullable = false, length = 30)
    private String seatTypeCode;

    @Column(name = "held_by_user_id")
    private Long heldByUserId;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Column(name = "order_id")
    private String orderId;
}
