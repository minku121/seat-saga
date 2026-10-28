package com.seatsaga.payment.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);

    private final RazorpayClient razorpayClient;
    private final String keyId;
    private final String keySecret;
    private final String currency;
    private final boolean mockEnabled;
    private final String webhookSecret;

    public RazorpayService(
            RazorpayClient razorpayClient,
            @Value("${razorpay.key.id:rzp_test_placeholder}") String keyId,
            @Value("${razorpay.key.secret:placeholder_secret}") String keySecret,
            @Value("${razorpay.currency:INR}") String currency,
            @Value("${razorpay.mock.enabled:false}") boolean mockEnabled,
            @Value("${razorpay.webhook.secret:placeholder_webhook_secret}") String webhookSecret) {
        this.razorpayClient = razorpayClient;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.currency = currency;
        this.mockEnabled = mockEnabled;
        this.webhookSecret = webhookSecret;
    }

    public boolean verifyWebhookSignature(String payload, String signature) {
        if (signature == null || signature.isBlank()) {
            log.warn("Webhook signature header is missing");
            return false;
        }
        if (webhookSecret == null || webhookSecret.isBlank() || "placeholder_webhook_secret".equalsIgnoreCase(webhookSecret)) {
            log.warn("Webhook secret not configured or placeholder. Skipping signature verification in development mode.");
            return true;
        }
        try {
            return com.razorpay.Utils.verifyWebhookSignature(payload, signature, webhookSecret);
        } catch (RazorpayException e) {
            log.error("Razorpay webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Creates a payment intent (Order) on Razorpay and returns the Razorpay order ID.
     *
     * @param orderId the internal booking/seat order ID
     * @param amount  the total amount in currency units (e.g. INR)
     * @return the Razorpay order ID (e.g. "order_EKwxwAgItmmXdp")
     */
    public String createPaymentIntent(String orderId, BigDecimal amount) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Order ID is required to create Razorpay payment intent");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        boolean isPlaceholder = keyId == null || keyId.isBlank()
                || "rzp_test_placeholder".equalsIgnoreCase(keyId)
                || "placeholder_secret".equalsIgnoreCase(keySecret);

        if (mockEnabled || isPlaceholder) {
            String mockRazorpayOrderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            log.info("Razorpay credentials are placeholder/mock. Simulating payment intent: {} for orderId: {}, amount: {} {}",
                    mockRazorpayOrderId, orderId, amount, currency);
            return mockRazorpayOrderId;
        }

        try {
            long amountInPaise = amount.multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", orderId.length() > 40 ? orderId.substring(0, 40) : orderId);
            orderRequest.put("payment_capture", 1);

            log.info("Creating Razorpay order. receipt: {}, amount: {} paise, currency: {}",
                    orderId, amountInPaise, currency);

            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String razorpayOrderId = razorpayOrder.get("id");

            log.info("Successfully created Razorpay order (payment intent): id={}, receipt={}",
                    razorpayOrderId, orderId);

            return razorpayOrderId;
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order for orderId: {}, amount: {}. Error: {}",
                    orderId, amount, e.getMessage(), e);
            throw new RuntimeException("Failed to create Razorpay payment intent: " + e.getMessage(), e);
        }
    }

    public String getKeyId() {
        return keyId;
    }

    public String getCurrency() {
        return currency;
    }
}
