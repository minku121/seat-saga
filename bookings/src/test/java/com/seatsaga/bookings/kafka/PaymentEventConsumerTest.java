package com.seatsaga.bookings.kafka;

import com.seatsaga.bookings.dto.PaymentStatusEvent;
import com.seatsaga.bookings.entity.Booking;
import com.seatsaga.bookings.entity.BookingStatus;
import com.seatsaga.bookings.entity.PaymentStatus;
import com.seatsaga.bookings.repository.BookingRepository;
import com.seatsaga.bookings.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentEventConsumerTest {

    @Mock
    private BookingRepository bookingRepository;

    private BookingService bookingService;
    private PaymentEventConsumer consumer;

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(bookingRepository);
        consumer = new PaymentEventConsumer(bookingService);
    }

    @Test
    void testConsumeSuccessPaymentStatus() {
        String orderId = "ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a";
        String gatewayOrderId = "order_TvYHSoYhwFtQju";
        String gatewayPaymentId = "pay_TvYIAwSHva0cKT";

        Booking existingBooking = new Booking();
        existingBooking.setOrderId(orderId);
        existingBooking.setUserId(34591L);
        existingBooking.setEventId(1L);
        existingBooking.setPaymentStatus(PaymentStatus.PENDING);
        existingBooking.setBookingStatus(BookingStatus.PENDING);

        when(bookingRepository.findByOrderId(orderId)).thenReturn(Optional.of(existingBooking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentStatusEvent event = new PaymentStatusEvent(
                orderId,
                1L,
                34591L,
                new BigDecimal("1"),
                new BigDecimal("1"),
                "SUCCESS",
                "SUCCESS",
                "CONFIRMED",
                gatewayOrderId,
                gatewayPaymentId,
                null,
                "2026-11-03T03:21:05.617356690Z"
        );

        consumer.consumePaymentStatus(orderId, event);

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(captor.capture());

        Booking saved = captor.getValue();
        assertEquals(PaymentStatus.SUCCESS, saved.getPaymentStatus());
        assertEquals(BookingStatus.CONFIRMED, saved.getBookingStatus());
        assertEquals(gatewayOrderId, saved.getGatewayOrderId());
        assertEquals(gatewayPaymentId, saved.getGatewayPaymentId());
    }

    @Test
    void testConsumeFailedPaymentStatus() {
        String orderId = "ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a";
        String gatewayOrderId = "order_TvYHSoYhwFtQju";
        String gatewayPaymentId = "pay_failed_123";

        Booking existingBooking = new Booking();
        existingBooking.setOrderId(orderId);
        existingBooking.setPaymentStatus(PaymentStatus.PENDING);
        existingBooking.setBookingStatus(BookingStatus.PENDING);

        when(bookingRepository.findByOrderId(orderId)).thenReturn(Optional.of(existingBooking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentStatusEvent event = new PaymentStatusEvent(
                orderId,
                1L,
                34591L,
                new BigDecimal("1"),
                new BigDecimal("1"),
                "FAILED",
                "FAILED",
                "CANCELLED",
                gatewayOrderId,
                gatewayPaymentId,
                "Payment failed or signature mismatch",
                "2026-11-03T03:21:05.617356690Z"
        );

        consumer.consumePaymentStatus(orderId, event);

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(captor.capture());

        Booking saved = captor.getValue();
        assertEquals(PaymentStatus.FAILED, saved.getPaymentStatus());
        assertEquals(BookingStatus.CANCELLED, saved.getBookingStatus());
        assertEquals(gatewayOrderId, saved.getGatewayOrderId());
        assertEquals(gatewayPaymentId, saved.getGatewayPaymentId());
    }

    @Test
    void testConsumeWithMissingBookingGracefullyLogs() {
        String orderId = "ORD-non-existent";
        when(bookingRepository.findByOrderId(orderId)).thenReturn(Optional.empty());

        PaymentStatusEvent event = new PaymentStatusEvent(
                orderId,
                1L,
                34591L,
                new BigDecimal("1"),
                new BigDecimal("1"),
                "SUCCESS",
                "SUCCESS",
                "CONFIRMED",
                "order_123",
                "pay_123",
                null,
                "2026-11-03T03:21:05.617356690Z"
        );

        assertDoesNotThrow(() -> consumer.consumePaymentStatus(orderId, event));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void testCustomJsonDeserializerWithActualPayload() {
        String json = "{\"orderId\":\"ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a\",\"eventId\":1,\"userId\":34591,\"amount\":1.00,\"totalAmount\":1.00,\"paymentStatus\":\"SUCCESS\",\"status\":\"SUCCESS\",\"bookingStatus\":\"CONFIRMED\",\"gatewayOrderId\":\"order_TvYHSoYhwFtQju\",\"gatewayPaymentId\":\"pay_TvYIAwSHva0cKT\",\"timestamp\":\"2026-11-03T03:21:05.617356690Z\"}";

        CustomJsonDeserializer<PaymentStatusEvent> deserializer =
                new CustomJsonDeserializer<>(PaymentStatusEvent.class);

        PaymentStatusEvent event = deserializer.deserialize("payment-status", json.getBytes(StandardCharsets.UTF_8));

        assertNotNull(event);
        assertEquals("ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a", event.orderId());
        assertEquals("SUCCESS", event.paymentStatus());
        assertEquals("order_TvYHSoYhwFtQju", event.gatewayOrderId());
        assertEquals("pay_TvYIAwSHva0cKT", event.gatewayPaymentId());
        assertEquals("2026-11-03T03:21:05.617356690Z", event.timestamp());
    }

    @Test
    void testCustomJsonDeserializerWithInitiatedPayload() {
        String json = "{\"orderId\":\"ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a\",\"eventId\":1,\"userId\":34591,\"amount\":1.00,\"totalAmount\":1.00,\"paymentStatus\":\"INITIATED\",\"status\":\"INITIATED\",\"bookingStatus\":\"PENDING\",\"gatewayOrderId\":\"order_TvYHSoYhwFtQju\",\"timestamp\":\"2026-11-03T03:20:23.858907239Z\"}";

        CustomJsonDeserializer<PaymentStatusEvent> deserializer =
                new CustomJsonDeserializer<>(PaymentStatusEvent.class);

        PaymentStatusEvent event = deserializer.deserialize("payment-status", json.getBytes(StandardCharsets.UTF_8));

        assertNotNull(event);
        assertEquals("ORD-ca9fb230-42b3-4450-876b-2ae3ea74c53a", event.orderId());
        assertEquals("INITIATED", event.paymentStatus());
        assertEquals("order_TvYHSoYhwFtQju", event.gatewayOrderId());
        assertEquals("2026-11-03T03:20:23.858907239Z", event.timestamp());
    }
}
