package com.seatsaga.payment.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.Map;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${DB_URL:${SPRING_DATASOURCE_URL:${spring.datasource.url:jdbc:postgresql://payment-seatsaga-minkuk603-2815.b.aivencloud.com:10031/defaultdb?sslmode=require}}}")
    private String dbUrl;

    @Value("${DB_USERNAME:${SPRING_DATASOURCE_USERNAME:${spring.datasource.username:avnadmin}}}")
    private String dbUsername;

    @Value("${DB_PASSWORD:${SPRING_DATASOURCE_PASSWORD:${spring.datasource.password:}}}")
    private String dbPassword;

    @Value("${PORT:${server.port:8084}}")
    private int serverPort;

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer() {
        return (Map<String, Object> hibernateProperties) -> {
            hibernateProperties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            hibernateProperties.put("hibernate.hbm2ddl.auto", "update");
            hibernateProperties.put("hibernate.show_sql", "true");
            hibernateProperties.put("hibernate.format_sql", "true");
        };
    }

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource() {
        log.info("Initializing DataSource with URL: {}", dbUrl);
        HikariDataSource ds = new HikariDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setJdbcUrl(dbUrl);
        ds.setUsername(dbUsername);
        ds.setPassword(dbPassword != null ? dbPassword : "");
        ds.setMaximumPoolSize(10);
        ds.setMinimumIdle(2);
        ds.setConnectionTimeout(30000);
        return ds;
    }

    @Bean
    public WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> webServerFactoryCustomizer() {
        return factory -> {
            log.info("Setting server port to: {}", serverPort);
            factory.setPort(serverPort);
        };
    }
}
