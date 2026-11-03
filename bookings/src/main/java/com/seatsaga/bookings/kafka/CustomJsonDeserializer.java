package com.seatsaga.bookings.kafka;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.common.serialization.Deserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.util.Map;

public class CustomJsonDeserializer<T> implements Deserializer<T> {

    private static final Logger log = LoggerFactory.getLogger(CustomJsonDeserializer.class);

    private final Class<T> targetType;
    private final ObjectMapper objectMapper;

    public CustomJsonDeserializer(Class<T> targetType) {
        this(targetType, createDefaultMapper());
    }

    public CustomJsonDeserializer(Class<T> targetType, ObjectMapper objectMapper) {
        this.targetType = targetType;
        this.objectMapper = objectMapper != null ? objectMapper : createDefaultMapper();
    }

    private static ObjectMapper createDefaultMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
    }

    @Override
    public T deserialize(String topic, byte[] data) {
        if (data == null || data.length == 0) {
            return null;
        }
        try {
            return objectMapper.readValue(data, targetType);
        } catch (Exception e) {
            log.error("Failed to deserialize Kafka record to {} for topic {}: {}",
                    targetType.getSimpleName(), topic, new String(data, StandardCharsets.UTF_8), e);
            return null;
        }
    }

    @Override
    public void close() {
    }
}
