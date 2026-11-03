package com.seatsaga.inventory.kafka;

import com.seatsaga.inventory.dto.PaymentStatusEvent;
import com.seatsaga.inventory.service.SeatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventConsumer.class);

    private final SeatService seatService;

    public PaymentEventConsumer(SeatService seatService) {
        this.seatService = seatService;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.payment-status:payment-status}",
            groupId = "${spring.kafka.consumer.group-id:inventory-service}"
    )
    public void consumePaymentStatus(
            @Header(name = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) PaymentStatusEvent event) {

        log.info("Inventory consumer received message from 'payment-status' topic with key: [{}], payload: [{}]", key, event);

        String orderId = (event != null && event.orderId() != null && !event.orderId().isBlank())
                ? event.orderId().trim()
                : (key != null ? key.trim() : null);

        if (orderId == null || orderId.isBlank()) {
            log.warn("Cannot process payment status event: missing orderId in key and payload");
            return;
        }

        seatService.processPaymentStatus(orderId, event);
    }
}

