package com.seatsaga.authservice.dto;

public class LoginResponse {

    private String name;
    private String email;
    private String token;

    public LoginResponse(String name, String email, String token) {
        this.name = name;
        this.email = email;
        this.token = token;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getToken() {
        return token;
    }
}