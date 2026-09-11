package com.pwioi.portal.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "SendOtpRequest")
public class SendOtpRequest {
    @Schema(example = "student@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    public String email;
    @Schema(example = "REGISTER", allowableValues = {"REGISTER", "LOGIN", "RESET_PASSWORD"})
    public String purpose;
}
