package com.seatsaga.bookings.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.common.errors.SerializationException;
import org.apache.kafka.common.serialization.Serializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.util.Map;

public class CustomJsonSerializer<T> implements Serializer<T> {

    private static final Logger log = LoggerFactory.getLogger(CustomJsonSerializer.class);
    private final ObjectMapper objectMapper;

    public CustomJsonSerializer() {
        this(new ObjectMapper());
    }

    public CustomJsonSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
    }

    @Override
    public byte[] serialize(String topic, T data) {
        if (data == null) {
            return null;
        }
        if (data instanceof byte[] bytes) {
            return bytes;
        }
        if (data instanceof String str) {
            return str.getBytes(StandardCharsets.UTF_8);
        }
        try {
            return objectMapper.writeValueAsBytes(data);
        } catch (Exception e) {
            log.error("Error serializing JSON message for topic {}: {}", topic, e.getMessage());
            throw new SerializationException("Error serializing JSON message for topic " + topic, e);
        }
    }

    @Override
    public void close() {
    }
}
