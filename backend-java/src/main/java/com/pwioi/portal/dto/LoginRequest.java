package com.pwioi.portal.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "LoginRequest", description = "Email/password login")
public class LoginRequest {
    @Schema(example = "student@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    public String email;
    @Schema(example = "********", requiredMode = Schema.RequiredMode.REQUIRED)
    public String password;
    @Schema(example = "STUDENT", description = "Optional role check")
    public String role;
}
