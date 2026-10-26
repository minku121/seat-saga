
package com.seatsaga.bookings.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SeatEventProducer {

    private static final Logger log = LoggerFactory.getLogger(SeatEventProducer.class);
    private static final String TOPIC = "seat-status";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public SeatEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishSeatsHeld(
            Long eventId,
            List<Long> seatIds,
            List<String> seatNumbers,
            Long userId,
            String orderId,
            BigDecimal totalAmount) {

        Map<String, Object> event = new HashMap<>();
        event.put("eventId", eventId);
        event.put("seatIds", seatIds);
        if (seatNumbers != null) {
            event.put("seatNumbers", seatNumbers);
        }
        event.put("userId", userId);
        if (orderId != null) {
            event.put("orderId", orderId);
        }
        if (totalAmount != null) {
            event.put("totalAmount", totalAmount);
        }
        event.put("status", "HELD");
        event.put("quantity", seatIds != null ? seatIds.size() : 0);

        String messageKey = (orderId != null && !orderId.isBlank())
                ? orderId
                : String.valueOf(eventId);

        kafkaTemplate.send(TOPIC, messageKey, event)
                .whenComplete((result, exception) -> {
                    if (exception != null) {
                        log.error("Kafka publish failed for seats {}: {}", seatIds, exception.getMessage());
                    } else {
                        log.info("Seat status event published for seats: {}", seatIds);
                    }
                });
    }

    public void publishSeatsHeld(
            Long eventId,
            List<Long> seatIds,
            List<String> seatNumbers,
            Long userId,
            String orderId) {
        publishSeatsHeld(eventId, seatIds, seatNumbers, userId, orderId, null);
    }

    public void publishSeatHeld(Long eventId, Long seatId, Long userId) {
        publishSeatsHeld(eventId, List.of(seatId), null, userId, null, null);
    }
}
