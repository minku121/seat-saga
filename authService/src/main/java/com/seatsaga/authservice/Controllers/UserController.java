package com.seatsaga.authservice.Controllers;

import com.seatsaga.authservice.dto.LoginRequest;
import com.seatsaga.authservice.dto.LoginResponse;
import com.seatsaga.authservice.dto.RegisterRequest;
import com.seatsaga.authservice.exceptions.DuplicateData;
import com.seatsaga.authservice.model.User;
import com.seatsaga.authservice.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        try {
            User user = userService.register(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(user);

        } catch (DuplicateData e) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginrequest) {

        try {
            LoginResponse response = userService.login(loginrequest);

            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(response);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }
}