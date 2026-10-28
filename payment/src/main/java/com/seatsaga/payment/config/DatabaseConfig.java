package com.seatsaga.payment.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.web.server.ConfigurableWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.JpaVendorAdapter;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import javax.sql.DataSource;

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
    public JpaVendorAdapter jpaVendorAdapter() {
        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        adapter.setDatabasePlatform("org.hibernate.dialect.PostgreSQLDialect");
        adapter.setGenerateDdl(true);
        adapter.setShowSql(true);
        return adapter;
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
    public WebServerFactoryCustomizer<ConfigurableWebServerFactory> webServerFactoryCustomizer() {
        return factory -> {
            log.info("Setting server port to: {}", serverPort);
            factory.setPort(serverPort);
        };
    }
}
