package com.seatsaga.bookings.kafka;

import com.seatsaga.bookings.dto.PaymentStatusEvent;
import com.seatsaga.bookings.service.BookingService;
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

    private final BookingService bookingService;

    public PaymentEventConsumer(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.payment-status:payment-status}",
            groupId = "${spring.kafka.consumer.group-id:booking-service}"
    )
    public void consumePaymentStatus(
            @Header(name = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) PaymentStatusEvent event) {

        log.info("Received message from 'payment-status' topic with key: [{}], payload: [{}]", key, event);

        if (event == null) {
            log.warn("Received empty or unparseable payment-status event for key: {}", key);
            return;
        }

        // Match orderId: either from event payload or Kafka key
        String orderId = (event.orderId() != null && !event.orderId().isBlank())
                ? event.orderId().trim()
                : (key != null ? key.trim() : null);

        if (orderId == null || orderId.isBlank()) {
            log.warn("Cannot process payment status event: missing orderId in key and payload");
            return;
        }

        String paymentStatus = event.paymentStatus() != null ? event.paymentStatus() : event.status();

        bookingService.processPaymentStatus(
                orderId,
                paymentStatus,
                event.bookingStatus(),
                event.gatewayOrderId(),
                event.gatewayPaymentId()
        );
    }
}

