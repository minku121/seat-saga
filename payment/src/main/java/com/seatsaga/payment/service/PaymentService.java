
package com.seatsaga.payment.service;

import com.seatsaga.payment.dto.SeatHeldEvent;
import com.seatsaga.payment.entity.Payment;
import com.seatsaga.payment.repository.PaymentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final RazorpayService razorpayService;
    private final com.seatsaga.payment.kafka.PaymentEventProducer paymentEventProducer;

    public PaymentService(
            PaymentRepository paymentRepository,
            RazorpayService razorpayService,
            com.seatsaga.payment.kafka.PaymentEventProducer paymentEventProducer) {
        this.paymentRepository = paymentRepository;
        this.razorpayService = razorpayService;
        this.paymentEventProducer = paymentEventProducer;
    }

    public Payment processPayment(SeatHeldEvent event) {
        if (event.orderId() == null || event.orderId().isBlank()) {
            log.warn("Payment processing rejected: Order ID is missing or blank. Event: {}", event);
            throw new IllegalArgumentException("Order ID is required");
        }

        log.info("Processing payment for orderId: {}, eventId: {}, userId: {}, totalAmount: {}",
                event.orderId(), event.eventId(), event.userId(), event.totalAmount());

        Optional<Payment> existingPaymentOpt = paymentRepository.findByOrderId(event.orderId());
        Payment payment;

        if (existingPaymentOpt.isPresent()) {
            payment = existingPaymentOpt.get();
            log.info("Payment record already exists for orderId: {} with status: {} (id: {}).",
                    payment.getOrderId(), payment.getStatus(), payment.getId());
            if ("INITIATED".equalsIgnoreCase(payment.getStatus()) && payment.getGatewayOrderId() != null) {
                return payment;
            }
            if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
                return payment;
            }
        } else {
            // Step 1: Pick the event, create record and mark it PENDING first
            Payment pendingPayment = new Payment(
                    event.orderId(),
                    event.eventId(),
                    event.userId(),
                    event.totalAmount(),
                    "PENDING"
            );
            // saveAndFlush so polling clients can immediately see the PENDING state
            payment = paymentRepository.saveAndFlush(pendingPayment);
            log.info("Payment record created with status PENDING for orderId: {} (id: {})",
                    payment.getOrderId(), payment.getId());
        }

        // Step 2: Create Razorpay payment intent
        try {
            log.info("Creating Razorpay payment intent for orderId: {}, totalAmount: {}",
                    payment.getOrderId(), payment.getTotalAmount());
            String razorpayOrderId = razorpayService.createPaymentIntent(payment.getOrderId(), payment.getTotalAmount());

            // Step 3: When gateway order id is ready, update payment and mark INITIATED
            payment.markInitiated(razorpayOrderId);
            Payment savedPayment = paymentRepository.save(payment);
            log.info("Payment successfully updated to INITIATED with gatewayOrderId: {} for orderId: {}",
                    savedPayment.getGatewayOrderId(), savedPayment.getOrderId());
            return savedPayment;
        } catch (Exception e) {
            log.error("Failed to create Razorpay payment intent for orderId: {}. Marking as FAILED.",
                    payment.getOrderId(), e);
            payment.markFailed(e.getMessage());
            Payment saved = paymentRepository.save(payment);
            paymentEventProducer.publishPaymentStatus(saved, "Failed to create payment intent: " + e.getMessage());
            throw e;
        }
    }

    @Transactional
    public Payment createPaymentIntent(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Order ID is required");
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for orderId: " + orderId));

        if ("INITIATED".equalsIgnoreCase(payment.getStatus()) && payment.getGatewayOrderId() != null) {
            log.info("Payment already initiated for orderId: {}, gatewayOrderId: {}",
                    orderId, payment.getGatewayOrderId());
            return payment;
        }

        String razorpayOrderId = razorpayService.createPaymentIntent(payment.getOrderId(), payment.getTotalAmount());
        payment.markInitiated(razorpayOrderId);

        Payment savedPayment = paymentRepository.save(payment);
        log.info("Payment intent created and marked INITIATED for orderId: {}, gatewayOrderId: {}",
                savedPayment.getOrderId(), savedPayment.getGatewayOrderId());

        return savedPayment;
    }

    /**
     * Process incoming Razorpay webhook event and update payment status to SUCCESS or FAILED.
     */
    @Transactional
    public Payment processWebhook(String payload, String signatureHeader) {
        boolean valid = razorpayService.verifyWebhookSignature(payload, signatureHeader);
        if (!valid) {
            log.error("Invalid Razorpay webhook signature");
            throw new IllegalArgumentException("Invalid Razorpay webhook signature");
        }

        org.json.JSONObject json = new org.json.JSONObject(payload);
        String event = json.optString("event");
        log.info("Received Razorpay webhook event: {}", event);

        org.json.JSONObject payloadObj = json.optJSONObject("payload");
        if (payloadObj == null) {
            log.warn("Webhook payload does not contain 'payload' object: {}", payload);
            return null;
        }

        org.json.JSONObject paymentObj = payloadObj.optJSONObject("payment");
        org.json.JSONObject paymentEntity = paymentObj != null ? paymentObj.optJSONObject("entity") : null;

        org.json.JSONObject orderObj = payloadObj.optJSONObject("order");
        org.json.JSONObject orderEntity = orderObj != null ? orderObj.optJSONObject("entity") : null;

        String razorpayPaymentId = paymentEntity != null ? paymentEntity.optString("id") : null;
        String razorpayOrderId = paymentEntity != null ? paymentEntity.optString("order_id") : null;

        if ((razorpayOrderId == null || razorpayOrderId.isBlank()) && orderEntity != null) {
            razorpayOrderId = orderEntity.optString("id");
        }

        String receipt = orderEntity != null ? orderEntity.optString("receipt") : null;
        if (receipt == null || receipt.isBlank()) {
            receipt = paymentEntity != null ? paymentEntity.optString("notes.receipt") : null;
        }

        log.info("Webhook event details: event={}, razorpayOrderId={}, razorpayPaymentId={}, receipt={}",
                event, razorpayOrderId, razorpayPaymentId, receipt);

        Optional<Payment> paymentOpt = Optional.empty();
        if (razorpayOrderId != null && !razorpayOrderId.isBlank()) {
            paymentOpt = paymentRepository.findByGatewayOrderId(razorpayOrderId);
        }
        if (paymentOpt.isEmpty() && receipt != null && !receipt.isBlank()) {
            paymentOpt = paymentRepository.findByOrderId(receipt);
        }

        if (paymentOpt.isEmpty()) {
            log.warn("No payment found matching gatewayOrderId: {} or receipt: {}", razorpayOrderId, receipt);
            return null;
        }

        Payment payment = paymentOpt.get();

        if ("payment.captured".equalsIgnoreCase(event) || "order.paid".equalsIgnoreCase(event)) {
            payment.markSuccess(razorpayPaymentId);
            Payment saved = paymentRepository.save(payment);
            log.info("Payment marked as SUCCESS for orderId: {}, gatewayOrderId: {}, gatewayPaymentId: {}",
                    saved.getOrderId(), saved.getGatewayOrderId(), saved.getGatewayPaymentId());
            paymentEventProducer.publishPaymentStatus(saved, null);
            return saved;
        } else if ("payment.failed".equalsIgnoreCase(event)) {
            payment.markFailed("Payment failed event received from Razorpay gateway");
            Payment saved = paymentRepository.save(payment);
            log.info("Payment marked as FAILED for orderId: {}", saved.getOrderId());
            paymentEventProducer.publishPaymentStatus(saved, "Payment failed event received from Razorpay gateway");
            return saved;
        } else {
            log.info("Unhandled webhook event: {}. No status change needed.", event);
            return payment;
        }
    }
}
