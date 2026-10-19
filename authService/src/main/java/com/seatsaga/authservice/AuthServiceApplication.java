package com.seatsaga.authservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);

        System.out.println("DB URL configured: " +
                (System.getenv("SPRING_DATASOURCE_URL") != null));

        System.out.println("DB username: " +
                System.getenv("SPRING_DATASOURCE_USERNAME"));

        System.out.println("DB password configured: " +
                (System.getenv("SPRING_DATASOURCE_PASSWORD") != null));
    }

}
