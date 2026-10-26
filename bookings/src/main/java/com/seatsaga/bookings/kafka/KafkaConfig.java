
package com.seatsaga.bookings.kafka;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.kafka.autoconfigure.KafkaProperties;

@Configuration
public class KafkaConfig {

    @Bean
    public ProducerFactory<String, Object> producerFactory(
            KafkaProperties kafkaProperties) {

        Map<String, Object> properties =
                new HashMap<>(kafkaProperties.buildProducerProperties());

        try {
            org.springframework.core.io.ClassPathResource certResource =
                    new org.springframework.core.io.ClassPathResource("ca.pem");
            if (certResource.exists()) {

                try (java.io.InputStream in = certResource.getInputStream()) {
                    String caCert = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    properties.put(org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
                    properties.put(org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, caCert.trim());
                }
            }
        } catch (Exception e) {
            System.err.println("Could not load Kafka CA certificate: " + e.getMessage());
        }

        return new DefaultKafkaProducerFactory<>(
                properties,
                new StringSerializer(),
                new JsonSerializer<>()
        );
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(
            ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    public org.springframework.kafka.core.KafkaAdmin kafkaAdmin(
            KafkaProperties kafkaProperties) {
        Map<String, Object> properties =
                new HashMap<>(kafkaProperties.buildAdminProperties());

        try {
            org.springframework.core.io.ClassPathResource certResource =
                    new org.springframework.core.io.ClassPathResource("ca.pem");
            if (certResource.exists()) {
                try (java.io.InputStream in = certResource.getInputStream()) {
                    String caCert = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    properties.put(org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
                    properties.put(org.apache.kafka.common.config.SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, caCert.trim());
                }
            }
        } catch (Exception e) {
            System.err.println("Could not load Kafka CA certificate for Admin: " + e.getMessage());
        }

        return new org.springframework.kafka.core.KafkaAdmin(properties);
    }

    @Bean
    public org.apache.kafka.clients.admin.NewTopic seatStatusTopic() {
        return org.springframework.kafka.config.TopicBuilder.name("seat-status")
                .partitions(1)
                .replicas(1)
                .build();
    }
}
