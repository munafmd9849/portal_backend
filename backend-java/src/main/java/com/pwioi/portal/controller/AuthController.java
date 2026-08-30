package com.pwioi.portal.controller;

import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user")
    public Map<String, Object> register(@RequestBody Map<String, Object> body) {
        return auth.register(body);
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public Map<String, Object> login(@RequestBody Map<String, Object> body) {
        return auth.login(body);
    }

    @PostMapping("/refresh")
    public Map<String, Object> refresh(@RequestBody Map<String, String> body) {
        return auth.refresh(body.get("refreshToken"));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout() {
        auth.logout(CurrentUser.require().getId());
        return Map.of("success", true, "message", "Logged out");
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        return auth.me(CurrentUser.require());
    }

    @PutMapping("/profile")
    public Map<String, Object> profile(@RequestBody Map<String, Object> body) {
        return auth.updateProfile(CurrentUser.require().getId(), body);
    }

    @PutMapping("/company-details")
    public Object company(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.RECRUITER);
        return auth.updateCompanyDetails(CurrentUser.require().getId(), body);
    }

    @PostMapping("/send-otp")
    @Operation(summary = "Send OTP to email")
    public Map<String, Object> sendOtp(@RequestBody Map<String, String> body) {
        return auth.sendOtp(body.get("email"), body.get("purpose"));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify OTP")
    public Map<String, Object> verifyOtp(@RequestBody Map<String, String> body) {
        return auth.verifyOtp(body.get("email"), body.get("otp"), body.get("purpose"));
    }

    @PostMapping("/verify-reset-otp")
    public Map<String, Object> verifyResetOtp(@RequestBody Map<String, String> body) {
        return auth.verifyOtp(body.get("email"), body.get("otp"), "RESET_PASSWORD");
    }

    @PostMapping("/update-password")
    public Map<String, Object> updatePassword(@RequestBody Map<String, String> body) {
        return auth.updatePassword(body.get("email"), body.get("password"), body.get("verificationToken"));
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> body) {
        return auth.sendOtp(body.get("email"), "RESET_PASSWORD");
    }
}
