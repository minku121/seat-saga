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
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@EnableKafka
@Configuration
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:payment-service}")
    private String groupId;

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

    @Value("${spring.kafka.listener.auto-startup:true}")
    private boolean autoStartup;

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
    public ConsumerFactory<String, SeatHeldEvent> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        if (bootstrapServers != null && !bootstrapServers.isBlank()) {
            props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        }
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

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
            log.warn("Kafka SASL credentials are not configured. Running in non-SASL mode.");
        }

        // Configure JsonDeserializer explicitly for SeatHeldEvent
        JsonDeserializer<SeatHeldEvent> jsonDeserializer = new JsonDeserializer<>(SeatHeldEvent.class, false);
        jsonDeserializer.addTrustedPackages("*");
        jsonDeserializer.setUseTypeHeaders(false);

        // Wrap with ErrorHandlingDeserializer so incompatible records do not poison partition poll loop
        ErrorHandlingDeserializer<SeatHeldEvent> errorHandlingValueDeserializer =
                new ErrorHandlingDeserializer<>(jsonDeserializer);
        ErrorHandlingDeserializer<String> errorHandlingKeyDeserializer =
                new ErrorHandlingDeserializer<>(new StringDeserializer());

        return new DefaultKafkaConsumerFactory<>(
                props,
                errorHandlingKeyDeserializer,
                errorHandlingValueDeserializer
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, SeatHeldEvent> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, SeatHeldEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setAutoStartup(autoStartup);

        // Ensure errors don't cause infinite stuck retry loops
        factory.setCommonErrorHandler(new DefaultErrorHandler(
                (record, exception) -> {
                    log.error("Error processing Kafka record at topic {}, partition {}, offset {}: {}",
                            record.topic(), record.partition(), record.offset(), exception.getMessage());
                },
                new FixedBackOff(1000L, 2L)
        ));

        return factory;
    }
}
