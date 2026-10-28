package com.seatsaga.payment.config;

import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.config.SslConfigs;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaProducerConfig.class);

    @Value("${spring.kafka.bootstrap-servers:kafka-2eb7b65-singhminku521-ce79.k.aivencloud.com:21866}")
    private String bootstrapServers;

    @Value("${spring.kafka.properties.sasl.jaas.config:${KAFKA_JAAS_CONFIG:}}")
    private String jaasConfig;

    @Value("${KAFKA_USERNAME:${spring.kafka.properties.sasl.username:}}")
    private String kafkaUsername;

    @Value("${KAFKA_PASSWORD:${spring.kafka.properties.sasl.password:}}")
    private String kafkaPassword;

    @Value("${spring.kafka.properties.ssl.truststore.certificates:}")
    private String truststoreCertificates;

    @Value("${app.kafka.topics.payment-status:payment-status}")
    private String paymentStatusTopic;

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
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);

        String jaas = resolveJaasConfig();
        if (jaas != null && !jaas.isBlank()) {
            props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, "SASL_SSL");
            props.put("sasl.mechanism", "SCRAM-SHA-256");
            props.put("sasl.jaas.config", jaas);

            // SSL Truststore with PEM CA certificate
            props.put(SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
            props.put(SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, resolveCaCertificate());
        } else {
            log.warn("Kafka producer SASL credentials not configured. Running in non-SASL mode.");
        }

        // Disable type headers so consumer services (like bookings) can deserialize cleanly
        props.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);

        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    public NewTopic paymentStatusTopic() {
        return TopicBuilder.name(paymentStatusTopic)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
