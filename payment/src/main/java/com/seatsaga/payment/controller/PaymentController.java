package com.seatsaga.payment.controller;

import com.seatsaga.payment.entity.Payment;
import com.seatsaga.payment.kafka.PaymentEventProducer;
import com.seatsaga.payment.kafka.SeatEventConsumer;
import com.seatsaga.payment.repository.PaymentRepository;
import com.seatsaga.payment.service.PaymentService;
import com.seatsaga.payment.service.RazorpayService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final SeatEventConsumer seatEventConsumer;
    private final RazorpayService razorpayService;
    private final com.seatsaga.payment.kafka.PaymentEventProducer paymentEventProducer;

    @Autowired(required = false)
    private KafkaListenerEndpointRegistry kafkaListenerEndpointRegistry;

    @Value("${app.kafka.topics.seats-held:seat-status}")
    private String seatsHeldTopic;

    @Value("${app.kafka.topics.payment-status:payment-status}")
    private String paymentStatusTopic;

    @Value("${spring.kafka.consumer.group-id:payment-service}")
    private String consumerGroupId;

    public PaymentController(
            PaymentService paymentService,
            PaymentRepository paymentRepository,
            SeatEventConsumer seatEventConsumer,
            RazorpayService razorpayService,
            com.seatsaga.payment.kafka.PaymentEventProducer paymentEventProducer) {
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
        this.seatEventConsumer = seatEventConsumer;
        this.razorpayService = razorpayService;
        this.paymentEventProducer = paymentEventProducer;
    }

    /**
     * Check if Kafka listener is running, assigned partitions, and event consumption stats.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getConsumerStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        MessageListenerContainer container = kafkaListenerEndpointRegistry != null
                ? kafkaListenerEndpointRegistry.getListenerContainer("seat-event-consumer")
                : null;
        boolean isRunning = container != null && container.isRunning();

        List<String> assignedPartitions = new ArrayList<>();
        if (container != null && container.getAssignedPartitions() != null) {
            container.getAssignedPartitions().forEach(tp -> assignedPartitions.add(tp.toString()));
        }

        status.put("kafkaListenerRunning", isRunning);
        status.put("configuredTopic", seatsHeldTopic);
        status.put("configuredPaymentStatusTopic", paymentStatusTopic);
        status.put("consumerGroupId", consumerGroupId);
        status.put("assignedPartitions", assignedPartitions);
        status.put("eventsConsumedFromKafka", seatEventConsumer.getConsumedCount());
        status.put("lastConsumedEvent", seatEventConsumer.getLastConsumedEvent());
        status.put("lastConsumerError", seatEventConsumer.getLastError());
        status.put("eventsPublishedToKafka", paymentEventProducer.getPublishedCount());
        status.put("lastPublishedEvent", paymentEventProducer.getLastPublishedEvent());
        status.put("totalPaymentsInDatabase", paymentRepository.count());

        return ResponseEntity.ok(status);
    }



    /**
     * List all payments saved in the database.
     */
    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    /**
     * Get Razorpay public key ID and currency for frontend checkout SDK initialization.
     */
    @GetMapping("/key")
    public ResponseEntity<Map<String, String>> getRazorpayKey() {
        Map<String, String> keyInfo = new LinkedHashMap<>();
        keyInfo.put("keyId", razorpayService.getKeyId());
        keyInfo.put("currency", razorpayService.getCurrency());
        return ResponseEntity.ok(keyInfo);
    }

    /**
     * Get payment details by orderId.
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<Payment> getPaymentByOrderId(@PathVariable String orderId) {
        return paymentRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Dedicated polling endpoint for frontend.
     * While Kafka is consuming the event or creating intent, returns 200 with status=PENDING and isReady=false.
     * When Razorpay intent is ready, returns 200 with status=INITIATED, isReady=true, and gatewayOrderId.
     */
    @GetMapping("/{orderId}/status")
    public ResponseEntity<Map<String, Object>> getPaymentStatus(@PathVariable String orderId) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("orderId", orderId);

        Optional<Payment> paymentOpt = paymentRepository.findByOrderId(orderId);
        if (paymentOpt.isEmpty()) {
            response.put("status", "PENDING");
            response.put("isReady", false);
            response.put("gatewayOrderId", null);
            response.put("gatewayId", null);
            response.put("message", "Waiting for seat-held event to be consumed");
            return ResponseEntity.ok(response);
        }

        Payment payment = paymentOpt.get();
        boolean isReady = "INITIATED".equalsIgnoreCase(payment.getStatus()) && payment.getGatewayOrderId() != null;

        response.put("status", payment.getStatus());
        response.put("isReady", isReady);
        response.put("gatewayOrderId", payment.getGatewayOrderId());
        response.put("gatewayId", payment.getGatewayOrderId());
        response.put("razorpayOrderId", payment.getGatewayOrderId());
        response.put("totalAmount", payment.getTotalAmount());
        response.put("razorpayKeyId", razorpayService.getKeyId());
        response.put("currency", razorpayService.getCurrency());
        response.put("eventId", payment.getEventId());
        response.put("userId", payment.getUserId());

        return ResponseEntity.ok(response);
    }

    /**
     * Create or retrieve Razorpay payment intent for an order and mark status as INITIATED.
     * Supports both POST and GET for frontend convenience.
     */
    @RequestMapping(value = "/{orderId}/intent", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Payment> createPaymentIntent(@PathVariable String orderId) {
        Payment payment = paymentService.createPaymentIntent(orderId);
        return ResponseEntity.ok(payment);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("error", ex.getMessage());
        return ResponseEntity.status(404).body(error);
    }

    /**
     * Razorpay webhook endpoint to handle asynchronous payment notifications (marks status SUCCESS/FAILED).
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signatureHeader) {
        Payment updatedPayment = paymentService.processWebhook(payload, signatureHeader);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        if (updatedPayment != null) {
            response.put("orderId", updatedPayment.getOrderId());
            response.put("paymentStatus", updatedPayment.getStatus());
            response.put("gatewayPaymentId", updatedPayment.getGatewayPaymentId());
        }
        return ResponseEntity.ok(response);
    }
}
