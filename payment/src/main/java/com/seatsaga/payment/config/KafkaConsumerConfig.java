package com.seatsaga.payment.config;

import com.seatsaga.payment.dto.SeatHeldEvent;
import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.config.SslConfigs;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@EnableKafka
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers:kafka-2eb7b65-singhminku521-ce79.k.aivencloud.com:21866}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:payment-service}")
    private String groupId;

    @Value("${spring.kafka.properties.sasl.jaas.config:}")
    private String jaasConfig;

    @Value("${spring.kafka.properties.ssl.truststore.certificates:}")
    private String truststoreCertificates;

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

    @Bean
    public ConsumerFactory<String, SeatHeldEvent> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        // Security Protocol & SASL Authentication
        props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, "SASL_SSL");
        props.put("sasl.mechanism", "SCRAM-SHA-256");

        if (jaasConfig != null && !jaasConfig.isBlank()) {
            props.put("sasl.jaas.config", jaasConfig);
        }

        // SSL Truststore with PEM CA certificate
        props.put(SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
        String cert = (truststoreCertificates != null && !truststoreCertificates.isBlank())
                ? truststoreCertificates
                : DEFAULT_CA_CERT;
        props.put(SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, cert);

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
        return factory;
    }
}
