package com.pwioi.portal.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "RefreshTokenRequest", description = "Exchange a refresh token for a new access token")
public class RefreshTokenRequest {
    @Schema(example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", requiredMode = Schema.RequiredMode.REQUIRED)
    public String refreshToken;
}
