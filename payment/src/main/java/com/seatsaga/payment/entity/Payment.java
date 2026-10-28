
package com.seatsaga.payment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
        name = "payments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_payment_order_id",
                        columnNames = "order_id"
                ),
                @UniqueConstraint(
                        name = "uk_gateway_payment_id",
                        columnNames = "gateway_payment_id"
                )
        }
)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, unique = true)
    private String orderId;

    @Column(name = "gateway_order_id")
    private String gatewayOrderId;

    @Column(name = "gateway_payment_id", unique = true)
    private String gatewayPaymentId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Payment() {}

    public Payment(
            String orderId,
            Long eventId,
            Long userId,
            BigDecimal totalAmount,
            String status) {
        this.orderId = orderId;
        this.eventId = eventId;
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.status = status;
        this.createdAt = Instant.now();
    }

    public Payment(
            String orderId,
            String gatewayOrderId,
            String gatewayPaymentId,
            Long eventId,
            Long userId,
            BigDecimal totalAmount,
            String status) {
        this.orderId = orderId;
        this.gatewayOrderId = gatewayOrderId;
        this.gatewayPaymentId = gatewayPaymentId;
        this.eventId = eventId;
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.status = status;
        this.createdAt = Instant.now();
    }

    public void markInitiated(String razorpayOrderId) {
        this.gatewayOrderId = razorpayOrderId;
        if (this.gatewayPaymentId == null) {
            this.gatewayPaymentId = razorpayOrderId;
        }
        this.status = "INITIATED";
    }

    public void markSuccess(String razorpayPaymentId) {
        if (razorpayPaymentId != null && !razorpayPaymentId.isBlank()) {
            this.gatewayPaymentId = razorpayPaymentId;
        }
        this.status = "SUCCESS";
    }

    public void markFailed(String reason) {
        this.status = "FAILED";
    }

    public Long getId() {
        return id;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    @Transient
    public String getGatewayId() {
        return gatewayOrderId;
    }

    @Transient
    public String getRazorpayOrderId() {
        return gatewayOrderId;
    }

    public String getGatewayPaymentId() {
        return gatewayPaymentId;
    }

    public Long getEventId() {
        return eventId;
    }

    public Long getUserId() {
        return userId;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setGatewayOrderId(String gatewayOrderId) {
        this.gatewayOrderId = gatewayOrderId;
    }

    public void setGatewayPaymentId(String gatewayPaymentId) {
        this.gatewayPaymentId = gatewayPaymentId;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
