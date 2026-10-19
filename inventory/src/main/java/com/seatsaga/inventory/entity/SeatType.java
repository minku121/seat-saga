package com.seatsaga.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
        name = "seat_type",
        uniqueConstraints = @UniqueConstraint(name = "uk_seat_type_event_code",
                columnNames = {"event_id", "code"}),
        indexes = @Index(name = "idx_seat_type_event", columnList = "event_id")
)
@Getter
@Setter
@NoArgsConstructor
public class SeatType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Event event;

    @Column(nullable = false, length = 30)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private int totalQuantity;

    @Column(nullable = false, updatable = false)
    private int heldQuantity;

    @Column(nullable = false, updatable = false)
    private int bookedQuantity;

    @Transient
    public int getAvailableQuantity() {
        return totalQuantity - heldQuantity - bookedQuantity;
    }

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        if (this.code != null) {
            this.code = this.code.trim().toUpperCase();
        }
    }
}