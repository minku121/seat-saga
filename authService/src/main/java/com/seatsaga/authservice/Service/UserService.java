package com.seatsaga.authservice.Service;

import com.seatsaga.authservice.dto.LoginRequest;
import com.seatsaga.authservice.dto.LoginResponse;
import com.seatsaga.authservice.dto.RegisterRequest;
import com.seatsaga.authservice.exceptions.DuplicateData;
import com.seatsaga.authservice.model.User;
import com.seatsaga.authservice.jpa.Jparepo;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final Jparepo jparepo;
    private final JwtService jwtService;

    public UserService(Jparepo jparepo, JwtService jwtService) {
        this.jparepo = jparepo;
        this.jwtService = jwtService;
    }

    public User register(RegisterRequest request) {

        if (jparepo.existsByEmail(request.getEmail())) {
            throw new DuplicateData("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword())
                .build();

        return jparepo.save(user);
    }

    public LoginResponse login(LoginRequest request) {

        User user = jparepo.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new RuntimeException("Invalid email or password"));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);

        return new LoginResponse(
                user.getName(),
                user.getEmail(),
                token
        );
    }
}