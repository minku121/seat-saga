package com.seatsaga.inventory.repository;

import com.seatsaga.inventory.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository
        extends JpaRepository<Event, Long> {
}