package com.seatsaga.payment.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.config.SslConfigs;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

    /**
     * Inject Spring Boot's auto-configured ObjectMapper which already has
     * JavaTimeModule registered — needed to serialize Instant in PaymentStatusEvent.
     */
    @Autowired
    private ObjectMapper objectMapper;

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.properties.security.protocol:SASL_SSL}")
    private String securityProtocol;

    @Value("${spring.kafka.properties.sasl.mechanism:SCRAM-SHA-256}")
    private String saslMechanism;

    @Value("${spring.kafka.properties.sasl.jaas.config:}")
    private String jaasConfig;

    @Value("${spring.kafka.properties.sasl.username:${KAFKA_USERNAME:}}")
    private String kafkaUsername;

    @Value("${spring.kafka.properties.sasl.password:${KAFKA_PASSWORD:}}")
    private String kafkaPassword;

    @Value("${spring.kafka.properties.ssl.truststore.certificates:${KAFKA_CA_CERT:}}")
    private String truststoreCertificates;

    @Value("${app.kafka.topics.payment-status:payment-status}")
    private String paymentStatusTopic;

    public String resolveJaasConfig() {
        if (jaasConfig != null && !jaasConfig.isBlank() && !jaasConfig.contains("password=\"\"") && !jaasConfig.contains("password=''")) {
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
                    String cert = new String(in.readAllBytes(), StandardCharsets.UTF_8).trim();
                    if (!cert.isBlank()) {
                        return cert;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not load ca.pem from classpath: {}", e.getMessage());
        }
        return null;
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        if (bootstrapServers != null && !bootstrapServers.isBlank()) {
            props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        }
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);

        String jaas = resolveJaasConfig();
        if (jaas != null && !jaas.isBlank()) {
            String protocol = (securityProtocol != null && !securityProtocol.isBlank()) ? securityProtocol : "SASL_SSL";
            props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, protocol);
            props.put("sasl.mechanism", (saslMechanism != null && !saslMechanism.isBlank()) ? saslMechanism : "SCRAM-SHA-256");
            props.put("sasl.jaas.config", jaas);

            // SSL Truststore with PEM CA certificate if provided or available on classpath
            String caCert = resolveCaCertificate();
            if (caCert != null && !caCert.isBlank()) {
                props.put(SslConfigs.SSL_TRUSTSTORE_TYPE_CONFIG, "PEM");
                props.put(SslConfigs.SSL_TRUSTSTORE_CERTIFICATES_CONFIG, caCert);
            }
        } else {
            if (securityProtocol != null && !securityProtocol.isBlank()) {
                props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, securityProtocol);
            }
            log.warn("Kafka producer SASL credentials not configured. Running in non-SASL mode.");
        }

        // Use ObjectMapper configured with JavaTimeModule so Instant fields serialize correctly
        ObjectMapper mapper = (objectMapper != null ? objectMapper.copy() : new ObjectMapper());
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        JsonSerializer<Object> valueSerializer = new JsonSerializer<>(mapper);
        valueSerializer.setAddTypeInfo(false);

        return new DefaultKafkaProducerFactory<>(props, new StringSerializer(), valueSerializer);
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
