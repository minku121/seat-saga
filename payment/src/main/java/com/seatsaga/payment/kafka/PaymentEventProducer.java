package com.seatsaga.payment.kafka;

import com.seatsaga.payment.dto.PaymentStatusEvent;
import com.seatsaga.payment.entity.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class PaymentEventProducer {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String paymentStatusTopic;
    private final AtomicLong publishedCount = new AtomicLong(0);
    private volatile PaymentStatusEvent lastPublishedEvent;

    public PaymentEventProducer(
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${app.kafka.topics.payment-status:payment-status}") String paymentStatusTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.paymentStatusTopic = paymentStatusTopic;
    }

    public CompletableFuture<SendResult<String, Object>> publishPaymentStatus(Payment payment, String failureReason) {
        if (payment == null) {
            log.warn("Cannot publish payment status event: payment is null");
            return CompletableFuture.completedFuture(null);
        }

        String status = payment.getStatus() != null ? payment.getStatus().toUpperCase() : "UNKNOWN";
        String bookingStatus = "SUCCESS".equalsIgnoreCase(status) ? "CONFIRMED" : "CANCELLED";

        PaymentStatusEvent event = new PaymentStatusEvent(
                payment.getOrderId(),
                payment.getEventId(),
                payment.getUserId(),
                payment.getTotalAmount(),
                payment.getTotalAmount(),
                status,
                status,
                bookingStatus,
                payment.getGatewayOrderId(),
                payment.getGatewayPaymentId(),
                failureReason,
                Instant.now()
        );

        return publishPaymentStatus(event);
    }

    public CompletableFuture<SendResult<String, Object>> publishPaymentStatus(PaymentStatusEvent event) {
        if (event == null || event.orderId() == null) {
            log.warn("Cannot publish payment status event: event or orderId is missing: {}", event);
            return CompletableFuture.completedFuture(null);
        }

        log.info("Publishing payment status event to topic '{}' for orderId: {}, status: {}, bookingStatus: {}",
                paymentStatusTopic, event.orderId(), event.status(), event.bookingStatus());

        try {
            CompletableFuture<SendResult<String, Object>> future =
                    kafkaTemplate.send(paymentStatusTopic, event.orderId(), event);

            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish payment status event to topic '{}' for orderId: {}",
                            paymentStatusTopic, event.orderId(), ex);
                } else {
                    publishedCount.incrementAndGet();
                    lastPublishedEvent = event;
                    long offset = (result != null && result.getRecordMetadata() != null)
                            ? result.getRecordMetadata().offset()
                            : -1;
                    int partition = (result != null && result.getRecordMetadata() != null)
                            ? result.getRecordMetadata().partition()
                            : -1;
                    log.info("Successfully published payment status event for orderId: {} [partition: {}, offset: {}]",
                            event.orderId(), partition, offset);
                }
            });

            return future;
        } catch (Exception e) {
            log.error("Exception occurred while sending payment status event to Kafka topic '{}': {}",
                    paymentStatusTopic, e.getMessage(), e);
            CompletableFuture<SendResult<String, Object>> failedFuture = new CompletableFuture<>();
            failedFuture.completeExceptionally(e);
            return failedFuture;
        }
    }

    public long getPublishedCount() {
        return publishedCount.get();
    }

    public PaymentStatusEvent getLastPublishedEvent() {
        return lastPublishedEvent;
    }

    public String getPaymentStatusTopic() {
        return paymentStatusTopic;
    }
}
