package com.seatsaga.payment.kafka;

import com.seatsaga.payment.dto.SeatHeldEvent;
import com.seatsaga.payment.service.PaymentService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

@Component
public class SeatEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(SeatEventConsumer.class);

    private final PaymentService paymentService;
    private final AtomicLong consumedCount = new AtomicLong(0);
    private volatile SeatHeldEvent lastConsumedEvent;
    private volatile String lastError;

    public SeatEventConsumer(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @KafkaListener(
            id = "seat-event-consumer",
            topics = "${app.kafka.topics.seats-held:seat-status}",
            groupId = "${spring.kafka.consumer.group-id:payment-service}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consume(SeatHeldEvent event) {
        if (event == null) {
            log.warn("Received null SeatHeldEvent, skipping");
            return;
        }

        // Only process events intended for seat holding (status is HELD or empty)
        if (event.status() != null && !event.status().isBlank() && !"HELD".equalsIgnoreCase(event.status())) {
            log.info("Ignoring non-HELD seat event: status={}, orderId={}", event.status(), event.orderId());
            return;
        }

        if (event.orderId() == null || event.orderId().isBlank()) {
            log.warn("Ignoring SeatHeldEvent with missing or blank orderId: {}", event);
            return;
        }

        consumedCount.incrementAndGet();
        this.lastConsumedEvent = event;
        this.lastError = null;

        log.info("Consumed SeatHeldEvent from Kafka: orderId={}, eventId={}, userId={}, totalAmount={}, seats={}",
                event.orderId(), event.eventId(), event.userId(), event.totalAmount(), event.seatNumbers());
        try {
            paymentService.processPayment(event);
            log.info("Successfully processed SeatHeldEvent and created payment intent for orderId: {}", event.orderId());
        } catch (Exception e) {
            this.lastError = e.getMessage();
            log.error("Failed to process SeatHeldEvent for orderId: {}", event.orderId(), e);
            throw e;
        }
    }

    public long getConsumedCount() {
        return consumedCount.get();
    }

    public SeatHeldEvent getLastConsumedEvent() {
        return lastConsumedEvent;
    }

    public String getLastError() {
        return lastError;
    }
}
