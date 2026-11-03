package com.seatsaga.inventory.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seatsaga.inventory.dto.PaymentStatusEvent;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.config.SslConfigs;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@EnableKafka
@Configuration
public class KafkaConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConfig.class);

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        return mapper;
    }

    private String loadCaCertificate() {
        try {
            ClassPathResource certResource = new ClassPathResource("ca.pem");
            if (certResource.exists()) {
                try (InputStream in = certResource.getInputStream()) {
                    String caCert = new String(in.readAllBytes(), StandardCharsets.UTF_8).trim();
                    if (!caCert.isBlank()) {
                        return caCert;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not load Kafka CA certificate: {}", e.getMessage());
        }
        return null;
    }

    @Bean
    public ConsumerFactory<String, PaymentStatusEvent> consumerFactory(
            KafkaProperties kafkaProperties,
            ObjectMapper objectMapper) {

        Map<String, Object> properties =
                new HashMap<>(kafkaProperties.buildConsumerProperties());

        String caCert = loadCaCertificate();
        if (caCert != null) {
            properties.put(SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
            properties.put(SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, caCert);
        }

        CustomJsonDeserializer<PaymentStatusEvent> jsonDeserializer =
                new CustomJsonDeserializer<>(PaymentStatusEvent.class, objectMapper);

        ErrorHandlingDeserializer<PaymentStatusEvent> errorHandlingValueDeserializer =
                new ErrorHandlingDeserializer<>(jsonDeserializer);
        ErrorHandlingDeserializer<String> errorHandlingKeyDeserializer =
                new ErrorHandlingDeserializer<>(new StringDeserializer());

        return new DefaultKafkaConsumerFactory<>(
                properties,
                errorHandlingKeyDeserializer,
                errorHandlingValueDeserializer
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, PaymentStatusEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, PaymentStatusEvent> consumerFactory) {

        ConcurrentKafkaListenerContainerFactory<String, PaymentStatusEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);

        factory.setCommonErrorHandler(new DefaultErrorHandler(
                (record, exception) -> log.error(
                        "Error processing Kafka record at topic {}, partition {}, offset {}: {}",
                        record.topic(), record.partition(), record.offset(), exception.getMessage()
                ),
                new FixedBackOff(1000L, 2L)
        ));

        return factory;
    }

    @Bean
    public KafkaAdmin kafkaAdmin(KafkaProperties kafkaProperties) {
        Map<String, Object> properties =
                new HashMap<>(kafkaProperties.buildAdminProperties());

        String caCert = loadCaCertificate();
        if (caCert != null) {
            properties.put(SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
            properties.put(SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, caCert);
        }

        return new KafkaAdmin(properties);
    }

    @Bean
    public NewTopic paymentStatusTopic() {
        return TopicBuilder.name("payment-status")
                .partitions(1)
                .replicas(1)
                .build();
    }
}
