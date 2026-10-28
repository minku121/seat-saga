
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
            groupId = "${spring.kafka.consumer.group-id:payment-service}"
    )
    public void consume(SeatHeldEvent event) {
        consumedCount.incrementAndGet();
        this.lastConsumedEvent = event;
        this.lastError = null;

        log.info("Consumed SeatHeldEvent from Kafka: orderId={}, eventId={}, userId={}, totalAmount={}, seats={}",
                event.orderId(), event.eventId(), event.userId(), event.totalAmount(), event.seatNumbers());
        try {
            paymentService.processPayment(event);
            log.info("Successfully processed SeatHeldEvent for orderId: {}", event.orderId());
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
