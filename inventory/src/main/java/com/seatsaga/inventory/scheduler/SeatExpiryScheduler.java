package com.seatsaga.inventory.scheduler;

import com.seatsaga.inventory.service.SeatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SeatExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeatExpiryScheduler.class);

    private final SeatService seatService;

    public SeatExpiryScheduler(SeatService seatService) {
        this.seatService = seatService;
    }

    /**
     * Periodic cron job to release seats from HELD when hold time expires.
     * Default runs every minute (configurable via app.seat.hold-expiry-cron).
     */
    @Scheduled(cron = "${app.seat.hold-expiry-cron:0 */1 * * * *}")
    public void releaseExpiredHolds() {
        log.debug("Running scheduled task to check and release expired seat holds...");
        try {
            int releasedCount = seatService.releaseExpiredHolds();
            if (releasedCount > 0) {
                log.info("Cron job released {} expired seat holds", releasedCount);
            }
        } catch (Exception e) {
            log.error("Error occurred while releasing expired seat holds: {}", e.getMessage(), e);
        }
    }
}

