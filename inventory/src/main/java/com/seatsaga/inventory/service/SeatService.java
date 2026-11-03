package com.seatsaga.inventory.service;

import com.seatsaga.inventory.dto.EventSeatsResponse;
import com.seatsaga.inventory.dto.HoldSeatResponse;
import com.seatsaga.inventory.dto.BookedSeatResponse;
import com.seatsaga.inventory.dto.PaymentStatusEvent;
import com.seatsaga.inventory.entity.Event;
import com.seatsaga.inventory.entity.Seat;
import com.seatsaga.inventory.entity.SeatStatus;
import com.seatsaga.inventory.entity.SeatType;
import com.seatsaga.inventory.repository.EventRepository;
import com.seatsaga.inventory.repository.SeatRepository;
import com.seatsaga.inventory.repository.SeatTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SeatService {

    private static final Logger log = LoggerFactory.getLogger(SeatService.class);

    private final SeatRepository seatRepo;
    private final EventRepository eventRepo;
    private final SeatTypeRepository seatTypeRepo;

    public SeatService(
            SeatRepository seatRepo,
            EventRepository eventRepo,
            SeatTypeRepository seatTypeRepo
    ) {
        this.seatRepo = seatRepo;
        this.eventRepo = eventRepo;
        this.seatTypeRepo = seatTypeRepo;
    }

    @Transactional
    public List<Seat> heldSeat(
            Long eventId,
            String seatTypeCode,
            int quantity,
            Long userId) {
        return heldSeat(eventId, seatTypeCode, quantity, userId, null);
    }

    @Transactional
    public List<Seat> heldSeat(
            Long eventId,
            String seatTypeCode,
            int quantity,
            Long userId,
            String orderId) {

        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Valid userId is required.");
        }

        if (eventId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Event ID must not be null.");
        }

        if (seatTypeCode == null || seatTypeCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Seat type code is required.");
        }

        if (quantity <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Quantity must be greater than zero.");
        }

        String normalizedCode = seatTypeCode.trim().toUpperCase();

        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        SeatType seatType = seatTypeRepo
                .findByEvent_IdAndCode(eventId, normalizedCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat type not found: " + normalizedCode));

        // Atomic conditional update on SeatType: checks totalQuantity - heldQuantity - bookedQuantity >= quantity
        // Canceled seats are NOT counted in heldQuantity or bookedQuantity, so they never reduce available seats!
        int updated = seatTypeRepo.tryHold(seatType.getId(), quantity);

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Not enough available seats for: " + normalizedCode);
        }

        Instant holdExpiresAt = Instant.now().plus(Duration.ofMinutes(10));

        // Fetch seat numbers currently in active use (HELD or BOOKED)
        // Canceled seats are strictly EXCLUDED from activeSeatNumbers so their numbers can be re-allocated
        Set<String> activeSeatNumbers = new HashSet<>(seatRepo.findActiveSeatNumbers(eventId, normalizedCode));

        List<Seat> seats = new ArrayList<>();
        int allocated = 0;
        int maxCapacity = seatType.getTotalQuantity();

        for (int num = 1; num <= maxCapacity && allocated < quantity; num++) {
            String seatNum = normalizedCode + "-" + num;
            if (activeSeatNumbers.contains(seatNum)) {
                continue;
            }

            // Reuse existing seat row if present (e.g. previously CANCELLED), or create a new one
            Seat seat = seatRepo.findByEvent_IdAndSeatNumber(eventId, seatNum)
                    .orElseGet(() -> {
                        Seat newSeat = new Seat();
                        newSeat.setEvent(event);
                        newSeat.setSeatTypeCode(normalizedCode);
                        newSeat.setSeatNumber(seatNum);
                        return newSeat;
                    });

            seat.setStatus(SeatStatus.HELD);
            seat.setHeldByUserId(userId);
            seat.setHoldExpiresAt(holdExpiresAt);
            seat.setOrderId(orderId);
            seat.setBookedBy(null);
            seat.setBookedAt(null);

            seats.add(seatRepo.save(seat));
            activeSeatNumbers.add(seatNum);
            allocated++;
        }

        if (allocated < quantity) {
            // Revert hold in case allocation could not complete
            seatTypeRepo.releaseHold(seatType.getId(), quantity - allocated);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not allocate seat numbers within capacity for: " + normalizedCode);
        }

        return seats;
    }

    @Transactional
    public HoldSeatResponse holdSeatsWithAmount(
            Long eventId,
            String seatTypeCode,
            int quantity,
            Long userId,
            String orderId) {

        String normalizedCode = seatTypeCode.trim().toUpperCase();

        SeatType seatType = seatTypeRepo
                .findByEvent_IdAndCode(eventId, normalizedCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat type not found: " + normalizedCode));

        List<Seat> seats = heldSeat(
                eventId,
                normalizedCode,
                quantity,
                userId,
                orderId
        );

        BigDecimal totalAmount = seatType.getPrice()
                .multiply(BigDecimal.valueOf(quantity));

        return new HoldSeatResponse(seats, totalAmount);
    }

    /**
     * Consumes and processes payment status events from the Kafka topic.
     * Updates seat status to BOOKED when payment succeeded,
     * or releases seats immediately when payment failed or was cancelled.
     */
    @Transactional
    public void processPaymentStatus(String orderId, PaymentStatusEvent event) {
        if (orderId == null || orderId.isBlank()) {
            log.warn("Cannot process payment status event: orderId is null or blank");
            return;
        }

        String paymentStatus = (event != null && event.paymentStatus() != null)
                ? event.paymentStatus()
                : (event != null ? event.status() : null);
        String bookingStatus = event != null ? event.bookingStatus() : null;

        boolean success = isSuccessStatus(paymentStatus, bookingStatus);
        boolean failure = isFailureStatus(paymentStatus, bookingStatus);

        log.info("Processing payment status for orderId: [{}], paymentStatus: [{}], bookingStatus: [{}], resolvedSuccess: {}, resolvedFailure: {}",
                orderId, paymentStatus, bookingStatus, success, failure);

        List<Seat> seats = seatRepo.findByOrderIdWithEvent(orderId);
        if (seats.isEmpty()) {
            seats = seatRepo.findByOrderId(orderId);
        }

        if (seats.isEmpty()) {
            log.warn("No seats found for orderId: {}", orderId);
            return;
        }

        if (success) {
            markSeatsBooked(seats, event);
        } else if (failure) {
            releaseSeatsOnFailure(seats, orderId);
        } else {
            log.info("Ignored payment status update for orderId: {}, paymentStatus: {}, bookingStatus: {}",
                    orderId, paymentStatus, bookingStatus);
        }
    }

    private void markSeatsBooked(List<Seat> seats, PaymentStatusEvent event) {
        List<Seat> heldSeats = seats.stream()
                .filter(s -> s.getStatus() == SeatStatus.HELD)
                .toList();

        if (heldSeats.isEmpty()) {
            log.info("No held seats to confirm for orderId: {} (all seats already processed)",
                    seats.get(0).getOrderId());
            return;
        }

        // Group held seats by event and seat type code to update SeatType counters
        Map<String, List<Seat>> seatsByCode = heldSeats.stream()
                .collect(Collectors.groupingBy(Seat::getSeatTypeCode));

        for (Map.Entry<String, List<Seat>> entry : seatsByCode.entrySet()) {
            String code = entry.getKey();
            int qty = entry.getValue().size();
            Long eventId = entry.getValue().get(0).getEvent().getId();

            seatTypeRepo.findByEvent_IdAndCode(eventId, code).ifPresent(seatType -> {
                int confirmed = seatTypeRepo.confirmHold(seatType.getId(), qty);
                log.info("Confirmed hold in seatType id {}: {} seats transitioned to booked", seatType.getId(), confirmed);
            });
        }

        Instant bookedAt = parseInstant(event != null ? event.timestamp() : null);
        Long bookedBy = (event != null && event.userId() != null)
                ? event.userId()
                : heldSeats.get(0).getHeldByUserId();

        for (Seat seat : heldSeats) {
            seat.setStatus(SeatStatus.BOOKED);
            seat.setBookedBy(bookedBy);
            seat.setBookedAt(bookedAt);
            seat.setHoldExpiresAt(null);
            seatRepo.save(seat);
        }

        log.info("Marked {} seats as BOOKED for orderId: {}, bookedBy: {}",
                heldSeats.size(), heldSeats.get(0).getOrderId(), bookedBy);
    }

    /**
     * Releases seats on payment failure or cancellation.
     * Canceled tickets / held seats are released back so they NEVER reduce total available seats!
     */
    private void releaseSeatsOnFailure(List<Seat> seats, String orderId) {
        List<Seat> activeSeats = seats.stream()
                .filter(s -> s.getStatus() == SeatStatus.HELD || s.getStatus() == SeatStatus.BOOKED)
                .toList();

        if (activeSeats.isEmpty()) {
            log.info("No active seats to release for orderId: {}", orderId);
            return;
        }

        // 1. Release HELD seats back to available
        List<Seat> heldSeats = activeSeats.stream()
                .filter(s -> s.getStatus() == SeatStatus.HELD)
                .toList();

        if (!heldSeats.isEmpty()) {
            Map<String, List<Seat>> heldByCode = heldSeats.stream()
                    .collect(Collectors.groupingBy(Seat::getSeatTypeCode));

            for (Map.Entry<String, List<Seat>> entry : heldByCode.entrySet()) {
                String code = entry.getKey();
                int qty = entry.getValue().size();
                Long eventId = entry.getValue().get(0).getEvent().getId();

                seatTypeRepo.findByEvent_IdAndCode(eventId, code).ifPresent(seatType -> {
                    int released = seatTypeRepo.releaseHold(seatType.getId(), qty);
                    log.info("Released hold in seatType id {}: {} seats released back to available", seatType.getId(), released);
                });
            }
        }

        // 2. Release BOOKED seats back to available (in case confirmed ticket is cancelled/refunded)
        List<Seat> bookedSeats = activeSeats.stream()
                .filter(s -> s.getStatus() == SeatStatus.BOOKED)
                .toList();

        if (!bookedSeats.isEmpty()) {
            Map<String, List<Seat>> bookedByCode = bookedSeats.stream()
                    .collect(Collectors.groupingBy(Seat::getSeatTypeCode));

            for (Map.Entry<String, List<Seat>> entry : bookedByCode.entrySet()) {
                String code = entry.getKey();
                int qty = entry.getValue().size();
                Long eventId = entry.getValue().get(0).getEvent().getId();

                seatTypeRepo.findByEvent_IdAndCode(eventId, code).ifPresent(seatType -> {
                    int released = seatTypeRepo.releaseBooked(seatType.getId(), qty);
                    log.info("Released booked seatType id {}: {} seats released back to available", seatType.getId(), released);
                });
            }
        }

        // 3. Mark seats as CANCELLED and clear hold expiry
        for (Seat seat : activeSeats) {
            seat.setStatus(SeatStatus.CANCELLED);
            seat.setHoldExpiresAt(null);
            seatRepo.save(seat);
        }

        log.info("Released {} seats (cancelled) for orderId: {}",
                activeSeats.size(), orderId);
    }

    /**
     * Periodic cron job to release seats whose hold time has expired.
     * Decrements heldQuantity in SeatType so expired holds do not reduce available seats.
     */
    @Transactional
    public int releaseExpiredHolds() {
        Instant now = Instant.now();
        List<Seat> expiredSeats = seatRepo.findByStatusAndHoldExpiresAtBefore(SeatStatus.HELD, now);

        if (expiredSeats.isEmpty()) {
            return 0;
        }

        log.info("Found {} expired held seats to release", expiredSeats.size());

        // Group by eventId and seatTypeCode
        record EventSeatKey(Long eventId, String seatTypeCode) {}

        Map<EventSeatKey, List<Seat>> grouped = expiredSeats.stream()
                .collect(Collectors.groupingBy(s -> new EventSeatKey(s.getEvent().getId(), s.getSeatTypeCode())));

        for (Map.Entry<EventSeatKey, List<Seat>> entry : grouped.entrySet()) {
            EventSeatKey key = entry.getKey();
            int qty = entry.getValue().size();

            seatTypeRepo.findByEvent_IdAndCode(key.eventId(), key.seatTypeCode()).ifPresent(seatType -> {
                int released = seatTypeRepo.releaseHold(seatType.getId(), qty);
                log.info("Cron released hold in seatType id {}: {} seats restored to available", seatType.getId(), released);
            });
        }

        for (Seat seat : expiredSeats) {
            seat.setStatus(SeatStatus.CANCELLED);
            seat.setHoldExpiresAt(null);
            seatRepo.save(seat);
        }

        log.info("Successfully released {} expired seats", expiredSeats.size());
        return expiredSeats.size();
    }

    /**
     * Get real-time event seat status summary and list of seats.
     * Ensures:
     * - availableSeats = sum of available seats across tiers (total - held - booked).
     * - heldSeats = count of currently held seats.
     * - bookedSeats = count of confirmed booked seats.
     * - cancelledSeats = recorded cancellations, which DO NOT reduce availableSeats!
     */
    @Transactional(readOnly = true)
    public EventSeatsResponse getEventSeats(Long eventId) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found: " + eventId));

        List<SeatType> seatTypes = seatTypeRepo.findByEvent_IdOrderByIdAsc(eventId);
        int totalCapacity = event.getMaxCapacity() != null ? event.getMaxCapacity() : 0;
        int heldSeats = seatTypes.stream().mapToInt(SeatType::getHeldQuantity).sum();
        int bookedSeats = seatTypes.stream().mapToInt(SeatType::getBookedQuantity).sum();
        int availableSeats = seatTypes.stream().mapToInt(SeatType::getAvailableQuantity).sum();

        List<Seat> allSeats = seatRepo.findAllByEventIdWithEvent(eventId);
        int cancelledSeats = (int) allSeats.stream().filter(s -> s.getStatus() == SeatStatus.CANCELLED).count();

        List<BookedSeatResponse> seatResponses = allSeats.stream()
                .map(BookedSeatResponse::fromEntity)
                .toList();

        return new EventSeatsResponse(
                event.getId(),
                event.getName(),
                totalCapacity,
                availableSeats,
                heldSeats,
                bookedSeats,
                cancelledSeats,
                seatResponses
        );
    }

    @Transactional(readOnly = true)
    public List<Seat> getSeatsByOrderId(String orderId) {
        List<Seat> seats = seatRepo.findByOrderIdWithEvent(orderId);
        if (seats.isEmpty()) {
            seats = seatRepo.findByOrderId(orderId);
        }
        return seats;
    }

    @Transactional(readOnly = true)
    public List<Seat> getBookedSeatsByUserId(Long userId) {
        List<Seat> seats = seatRepo.findUserSeatsWithEvent(userId, SeatStatus.HELD);
        if (seats.isEmpty()) {
            seats = seatRepo.findByBookedBy(userId);
        }
        return seats;
    }

    @Transactional(readOnly = true)
    public List<Seat> getAllBookedSeats(Long eventId) {
        if (eventId != null) {
            return seatRepo.findByEvent_IdAndStatus(eventId, SeatStatus.BOOKED);
        }
        return seatRepo.findByStatus(SeatStatus.BOOKED);
    }

    private boolean isSuccessStatus(String paymentStatus, String bookingStatus) {
        if (paymentStatus != null) {
            String p = paymentStatus.trim().toUpperCase();
            if (p.equals("SUCCESS") || p.equals("PAID") || p.equals("COMPLETED")) {
                return true;
            }
        }
        if (bookingStatus != null) {
            String b = bookingStatus.trim().toUpperCase();
            return b.equals("CONFIRMED") || b.equals("SUCCESS") || b.equals("BOOKED");
        }
        return false;
    }

    private boolean isFailureStatus(String paymentStatus, String bookingStatus) {
        if (paymentStatus != null) {
            String p = paymentStatus.trim().toUpperCase();
            if (p.equals("FAILED") || p.equals("FAILURE") || p.equals("CANCELLED") || p.equals("REJECTED") || p.equals("EXPIRED")) {
                return true;
            }
        }
        if (bookingStatus != null) {
            String b = bookingStatus.trim().toUpperCase();
            return b.equals("FAILED") || b.equals("CANCELLED") || b.equals("REJECTED");
        }
        return false;
    }

    private Instant parseInstant(String timestamp) {
        if (timestamp != null && !timestamp.isBlank()) {
            try {
                return Instant.parse(timestamp.trim());
            } catch (Exception ignored) {
            }
        }
        return Instant.now();
    }
}
