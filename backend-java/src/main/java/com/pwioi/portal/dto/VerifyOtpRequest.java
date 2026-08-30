package com.pwioi.portal.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "VerifyOtpRequest")
public class VerifyOtpRequest {
    @Schema(example = "student@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    public String email;
    @Schema(example = "123456", requiredMode = Schema.RequiredMode.REQUIRED)
    public String otp;
    @Schema(example = "REGISTER")
    public String purpose;
}
