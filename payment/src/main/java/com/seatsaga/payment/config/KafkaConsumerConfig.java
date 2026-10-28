package com.seatsaga.payment.config;

import com.seatsaga.payment.dto.SeatHeldEvent;
import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.config.SslConfigs;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@EnableKafka
@Configuration
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    @Value("${spring.kafka.bootstrap-servers:kafka-2eb7b65-singhminku521-ce79.k.aivencloud.com:21866}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:payment-service}")
    private String groupId;

    @Value("${spring.kafka.properties.sasl.jaas.config:${KAFKA_JAAS_CONFIG:}}")
    private String jaasConfig;

    @Value("${KAFKA_USERNAME:${spring.kafka.properties.sasl.username:}}")
    private String kafkaUsername;

    @Value("${KAFKA_PASSWORD:${spring.kafka.properties.sasl.password:}}")
    private String kafkaPassword;

    @Value("${spring.kafka.properties.ssl.truststore.certificates:}")
    private String truststoreCertificates;

    @Value("${spring.kafka.listener.auto-startup:true}")
    private boolean autoStartup;

    private static final String DEFAULT_CA_CERT =
            "-----BEGIN CERTIFICATE-----\n" +
            "MIIBxDCCAWqgAwIBAgIUIcvYwp5dJ1Q8AkJT/KpfqjdUApcwCgYIKoZIzj0EAwMw\n" +
            "QDE+MDwGA1UEAww1NDU0OTM1MzEtOWM4MS00MGEzLWEzYWItNGU3YjkzOTA0MTM1\n" +
            "IFByb2plY3QgQ0EgR0VOIDIwHhcNMjYwODA1MjMzNTE0WhcNMzYwODAyMjMzNTE0\n" +
            "WjBAMT4wPAYDVQQDDDU0NTQ5MzUzMS05YzgxLTQwYTMtYTNhYi00ZTdiOTM5MDQx\n" +
            "MzUgUHJvamVjdCBDQSBHRU4gMjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABMCr\n" +
            "fu2CQLbGNj6ngluZrfxQ6h8nW3PnEEWK/yWRtgd0w8bbbB8OsASS8AX1y3L3WS+7\n" +
            "SL1hHikVpwO2k8iIG+CjQjBAMB0GA1UdDgQWBBR2rbE3NM24WG2g/+b85ZGJ7noX\n" +
            "CDASBgNVHRMBAf8ECDAGAQH/AgEAMAsGA1UdDwQEAwIBBjAKBggqhkjOPQQDAwNI\n" +
            "ADBFAiAXKnan4YpNPpzYGxnZrx7+4ZiHveTvLHv19558ICnZLgIhANrHNWSikK5c\n" +
            "M5mkvpAIwgwlxv2tPS2IIrTyw4Vk7CAI\n" +
            "-----END CERTIFICATE-----";

    public String resolveJaasConfig() {
        if (jaasConfig != null && !jaasConfig.isBlank()) {
            return jaasConfig.trim();
        }
        if (kafkaUsername != null && !kafkaUsername.isBlank() && kafkaPassword != null && !kafkaPassword.isBlank()) {
            return String.format(
                    "org.apache.kafka.common.security.scram.ScramLoginModule required username=\"%s\" password=\"%s\";",
                    kafkaUsername.trim(), kafkaPassword.trim()
            );
        }
        return null;
    }

    private String resolveCaCertificate() {
        if (truststoreCertificates != null && !truststoreCertificates.isBlank()) {
            return truststoreCertificates.trim();
        }
        try {
            ClassPathResource certResource = new ClassPathResource("ca.pem");
            if (certResource.exists()) {
                try (InputStream in = certResource.getInputStream()) {
                    return new String(in.readAllBytes(), StandardCharsets.UTF_8).trim();
                }
            }
        } catch (Exception e) {
            log.warn("Could not load ca.pem from classpath: {}", e.getMessage());
        }
        return DEFAULT_CA_CERT;
    }

    @Bean
    public ConsumerFactory<String, SeatHeldEvent> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        String jaas = resolveJaasConfig();
        if (jaas != null && !jaas.isBlank()) {
            props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, "SASL_SSL");
            props.put("sasl.mechanism", "SCRAM-SHA-256");
            props.put("sasl.jaas.config", jaas);

            // SSL Truststore with PEM CA certificate
            props.put(SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
            props.put(SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, resolveCaCertificate());
        } else {
            log.warn("Kafka SASL credentials are not configured. Running in non-SASL mode.");
        }

        // Deserializer properties
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, SeatHeldEvent.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);

        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, SeatHeldEvent> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, SeatHeldEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        if (resolveJaasConfig() == null) {
            log.warn("Kafka credentials (KAFKA_PASSWORD/jaasConfig) not provided. Disabling auto-startup of seat-event-consumer listener so application can boot cleanly.");
            factory.setAutoStartup(false);
        } else {
            factory.setAutoStartup(autoStartup);
        }
        return factory;
    }
}
