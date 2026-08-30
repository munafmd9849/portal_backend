package com.pwioi.portal.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

@Schema(name = "RegisterRequest", description = "Create an account after OTP verification")
public class RegisterRequest {
    @Schema(example = "student@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    public String email;
    @Schema(example = "********", requiredMode = Schema.RequiredMode.REQUIRED)
    public String password;
    @Schema(example = "STUDENT", allowableValues = {"STUDENT", "RECRUITER", "ADMIN"})
    public String role;
    @Schema(example = "Ada Lovelace")
    public String fullName;
    @Schema(example = "Ada")
    public String displayName;
    @Schema(description = "OTP sent to email")
    public String otp;
    public String verificationToken;
    @Schema(description = "Student or recruiter profile fields")
    public Map<String, Object> profile;
}
